import sqlite3

def reset_tables(database_path):
    conn = sqlite3.connect(database_path)
    cursor = conn.cursor()

    try:
        # Disable foreign key constraints temporarily
        cursor.execute("PRAGMA foreign_keys = OFF;")

        # Reset the `messages` table
        cursor.execute("DELETE FROM messages;")

        # Reset the `users` table
        cursor.execute("DELETE FROM users;")

        # Reset AUTOINCREMENT sequences in sqlite_sequence
        cursor.execute("DELETE FROM sqlite_sequence;")

        # Enable foreign key constraints again
        cursor.execute("PRAGMA foreign_keys = ON;")

        # Commit the changes
        conn.commit()
        print("Tables reset successfully.")

    except sqlite3.Error as e:
        print(f"An error occurred: {e}")
        conn.rollback()

    finally:
        conn.close()

# Call the function with the path to your SQLite database
reset_tables('chat_app.db')
