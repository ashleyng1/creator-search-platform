from database import engine


def ensure_auth_schema() -> None:
    """Add auth columns and tables to existing SQLite DBs without a full migration."""
    with engine.connect() as conn:
        user_cols = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(users)")}
        if "email_verified" not in user_cols:
            conn.exec_driver_sql(
                "ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 1 NOT NULL"
            )
            conn.commit()
