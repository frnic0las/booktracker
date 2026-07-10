import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BarcodeScannerProps } from "./BarcodeScanner";
import { BarcodeScanner } from "./BarcodeScanner";

// ZXing is mocked so the decode lifecycle is driven from the tests without a
// real camera. decodeFromConstraints captures the continuous-decode callback
// and returns controls whose stop() we assert on for stream cleanup.
const stop = vi.fn();
const decodeFromConstraints = vi.fn();

vi.mock("@zxing/browser", () => ({
  BrowserMultiFormatReader: class {
    decodeFromConstraints(...args: unknown[]) {
      return (decodeFromConstraints as (...a: unknown[]) => unknown)(...args);
    }
  },
}));

vi.mock("@zxing/library", () => ({
  BarcodeFormat: { EAN_13: 3 },
  DecodeHintType: { POSSIBLE_FORMATS: 2 },
}));

type DecodeCallback = (result: { getText: () => string } | undefined) => void;

function captureDecodeCallback(): { fire: DecodeCallback } {
  const ref: { fire: DecodeCallback } = { fire: () => {} };
  decodeFromConstraints.mockImplementation(async (_constraints, _video, cb: DecodeCallback) => {
    ref.fire = cb;
    return { stop };
  });
  return ref;
}

function renderScanner(overrides: Partial<BarcodeScannerProps> = {}): BarcodeScannerProps {
  const props: BarcodeScannerProps = {
    onDetected: vi.fn(),
    onCancel: vi.fn(),
    onManualEntry: vi.fn(),
    ...overrides,
  };
  render(<BarcodeScanner {...props} />);
  return props;
}

beforeEach(() => {
  stop.mockReset();
  decodeFromConstraints.mockReset();
});

afterEach(cleanup);

describe("BarcodeScanner", () => {
  it("decodes an ISBN barcode and reports it to the search flow", async () => {
    const decode = captureDecodeCallback();
    const { onDetected } = renderScanner();

    await waitFor(() => expect(decodeFromConstraints).toHaveBeenCalled());

    decode.fire({ getText: () => "9782070368228" });

    expect(await screen.findByText("Barcode detected")).toBeTruthy();
    // Stream is released the instant a barcode is decoded.
    expect(stop).toHaveBeenCalled();

    await waitFor(() => expect(onDetected).toHaveBeenCalledWith("9782070368228"), {
      timeout: 1500,
    });
  });

  it("ignores non-ISBN barcodes and keeps scanning", async () => {
    const decode = captureDecodeCallback();
    const { onDetected } = renderScanner();

    await waitFor(() => expect(decodeFromConstraints).toHaveBeenCalled());

    decode.fire({ getText: () => "012345678905" }); // valid UPC-A, not an ISBN

    expect(screen.queryByText("Barcode detected")).toBeNull();
    expect(onDetected).not.toHaveBeenCalled();
  });

  it("releases the camera stream on unmount", async () => {
    decodeFromConstraints.mockImplementation(async () => ({ stop }));

    const view = render(
      <BarcodeScanner onDetected={vi.fn()} onCancel={vi.fn()} onManualEntry={vi.fn()} />,
    );

    await waitFor(() => expect(decodeFromConstraints).toHaveBeenCalled());
    view.unmount();

    await waitFor(() => expect(stop).toHaveBeenCalled());
  });

  it("shows the permission-denied fallback and routes to manual entry", async () => {
    decodeFromConstraints.mockRejectedValue(new DOMException("no", "NotAllowedError"));
    const { onManualEntry } = renderScanner();

    expect(await screen.findByText("Camera access needed")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Enter ISBN manually" }));
    expect(onManualEntry).toHaveBeenCalled();
  });

  it("shows the no-camera fallback when no camera is available", async () => {
    decodeFromConstraints.mockRejectedValue(new DOMException("none", "NotFoundError"));
    renderScanner();

    expect(await screen.findByText("No camera available")).toBeTruthy();
  });

  it("calls onCancel when the scan is dismissed", async () => {
    captureDecodeCallback();
    const { onCancel } = renderScanner();

    await waitFor(() => expect(decodeFromConstraints).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Cancel scan" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
