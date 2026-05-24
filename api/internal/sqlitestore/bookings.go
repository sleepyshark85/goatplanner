package sqlitestore

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"goatplanner/internal/booking"
)

type BookingRepository struct {
	db *sql.DB
}

func NewBookingRepository(db *sql.DB) *BookingRepository {
	return &BookingRepository{db: db}
}

var _ booking.Repository = (*BookingRepository)(nil)

func (r *BookingRepository) Save(ctx context.Context, b booking.Booking) error {
	_, err := r.db.ExecContext(ctx, `
        INSERT INTO bookings (id, court_name, team_name, start_at, end_at, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
		b.ID, b.CourtName, b.TeamName,
		b.StartAt.UTC().Format(time.RFC3339),
		b.EndAt.UTC().Format(time.RFC3339),
		string(b.Status),
		b.CreatedAt.UTC().Format(time.RFC3339),
	)
	if err != nil {
		return fmt.Errorf("insert booking: %w", err)
	}
	return nil
}

func (r *BookingRepository) List(ctx context.Context) ([]booking.Booking, error) {
	rows, err := r.db.QueryContext(ctx, `
        SELECT id, court_name, team_name, start_at, end_at, status, created_at
        FROM bookings
        ORDER BY start_at DESC
    `)
	if err != nil {
		return nil, fmt.Errorf("query bookings: %w", err)
	}
	defer rows.Close()

	out := make([]booking.Booking, 0)
	for rows.Next() {
		var (
			b                              booking.Booking
			status                         string
			startStr, endStr, createdStr   string
		)
		if err := rows.Scan(&b.ID, &b.CourtName, &b.TeamName, &startStr, &endStr, &status, &createdStr); err != nil {
			return nil, fmt.Errorf("scan booking: %w", err)
		}
		if b.StartAt, err = time.Parse(time.RFC3339, startStr); err != nil {
			return nil, fmt.Errorf("parse start_at: %w", err)
		}
		if b.EndAt, err = time.Parse(time.RFC3339, endStr); err != nil {
			return nil, fmt.Errorf("parse end_at: %w", err)
		}
		if b.CreatedAt, err = time.Parse(time.RFC3339, createdStr); err != nil {
			return nil, fmt.Errorf("parse created_at: %w", err)
		}
		b.Status = booking.Status(status)
		out = append(out, b)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate bookings: %w", err)
	}
	return out, nil
}
