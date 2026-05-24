package sqlitestore_test

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"goatplanner/internal/booking"
	"goatplanner/internal/sqlitestore"
)

func newRepo(t *testing.T) *sqlitestore.BookingRepository {
	t.Helper()
	db, err := sqlitestore.OpenDB(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("OpenDB: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if err := sqlitestore.RunMigrations(db); err != nil {
		t.Fatalf("RunMigrations: %v", err)
	}
	return sqlitestore.NewBookingRepository(db)
}

func TestRepository_SaveAndList(t *testing.T) {
	repo := newRepo(t)
	ctx := context.Background()

	earlier := booking.Booking{
		ID: "a", CourtName: "Court A", TeamName: "Team A",
		StartAt: time.Date(2026, 5, 20, 10, 0, 0, 0, time.UTC),
		EndAt:   time.Date(2026, 5, 20, 11, 0, 0, 0, time.UTC),
		Status:  booking.StatusApproved,
		CreatedAt: time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC),
	}
	later := booking.Booking{
		ID: "b", CourtName: "Court B", TeamName: "Team B",
		StartAt: time.Date(2026, 5, 21, 10, 0, 0, 0, time.UTC),
		EndAt:   time.Date(2026, 5, 21, 11, 0, 0, 0, time.UTC),
		Status:  booking.StatusApproved,
		CreatedAt: time.Date(2026, 5, 19, 12, 30, 0, 0, time.UTC),
	}

	if err := repo.Save(ctx, earlier); err != nil {
		t.Fatalf("Save earlier: %v", err)
	}
	if err := repo.Save(ctx, later); err != nil {
		t.Fatalf("Save later: %v", err)
	}

	got, err := repo.List(ctx)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("want 2 bookings, got %d", len(got))
	}
	if got[0].ID != "b" {
		t.Errorf("expected newest-start first; got order: %s, %s", got[0].ID, got[1].ID)
	}
	if !got[0].StartAt.Equal(later.StartAt) {
		t.Errorf("StartAt round-trip: got %v, want %v", got[0].StartAt, later.StartAt)
	}
	if got[0].Status != booking.StatusApproved {
		t.Errorf("Status round-trip: got %q", got[0].Status)
	}
}

func TestRepository_ListEmpty(t *testing.T) {
	repo := newRepo(t)
	got, err := repo.List(context.Background())
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 0 {
		t.Fatalf("want empty list, got %d items", len(got))
	}
}
