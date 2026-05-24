-- +goose Up
CREATE TABLE bookings (
    id          TEXT PRIMARY KEY,
    court_name  TEXT NOT NULL,
    team_name   TEXT NOT NULL,
    start_at    TEXT NOT NULL,
    end_at      TEXT NOT NULL,
    status      TEXT NOT NULL,
    created_at  TEXT NOT NULL
);

CREATE INDEX idx_bookings_start_at ON bookings(start_at);

-- +goose Down
DROP INDEX idx_bookings_start_at;
DROP TABLE bookings;
