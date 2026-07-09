import { sql } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const books = sqliteTable("books", {
  id: text("id").primaryKey(),
  googleBooksId: text("google_books_id").notNull().unique(),
  title: text("title").notNull(),
  authors: text("authors"),
  description: text("description"),
  thumbnail: text("thumbnail"),
  publishedDate: text("published_date"),
  pageCount: integer("page_count"),
  isbn13: text("isbn13"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const userBooks = sqliteTable(
  "user_books",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id),
    status: text("status", {
      enum: ["want_to_read", "reading", "read"],
    }).notNull(),
    category: text("category", { enum: ["novel", "non_fiction"] })
      .notNull()
      .default("novel"),
    rating: text("rating", { enum: ["good", "average", "bad"] }),
    abandoned: integer("abandoned", { mode: "boolean" }).notNull().default(false),
    notes: text("notes"),
    startedAt: integer("started_at", { mode: "timestamp" }),
    finishedAt: integer("finished_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("user_books_user_id_book_id_idx").on(
      table.userId,
      table.bookId,
    ),
  ],
);

export const lists = sqliteTable("lists", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const listBooks = sqliteTable(
  "list_books",
  {
    id: text("id").primaryKey(),
    listId: text("list_id")
      .notNull()
      .references(() => lists.id),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id),
    addedAt: integer("added_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("list_books_list_id_book_id_idx").on(
      table.listId,
      table.bookId,
    ),
  ],
);

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Book = InferSelectModel<typeof books>;
export type NewBook = InferInsertModel<typeof books>;

export type UserBook = InferSelectModel<typeof userBooks>;
export type NewUserBook = InferInsertModel<typeof userBooks>;

export type List = InferSelectModel<typeof lists>;
export type NewList = InferInsertModel<typeof lists>;

export type ListBook = InferSelectModel<typeof listBooks>;
export type NewListBook = InferInsertModel<typeof listBooks>;
