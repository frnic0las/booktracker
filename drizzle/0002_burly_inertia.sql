DROP INDEX "books_google_books_id_unique";--> statement-breakpoint
DROP INDEX "list_books_list_id_book_id_idx";--> statement-breakpoint
DROP INDEX "user_books_user_id_book_id_idx";--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
ALTER TABLE `user_books` ALTER COLUMN "rating" TO "rating" text;--> statement-breakpoint
CREATE UNIQUE INDEX `books_google_books_id_unique` ON `books` (`google_books_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `list_books_list_id_book_id_idx` ON `list_books` (`list_id`,`book_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_books_user_id_book_id_idx` ON `user_books` (`user_id`,`book_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
ALTER TABLE `user_books` ADD `abandoned` integer DEFAULT false NOT NULL;