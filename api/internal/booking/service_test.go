package booking_test

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"goatplanner/internal/booking"
)

type fakeRepo struct {
	mu       sync.Mutex
	saved    []booking.Booking
	saveErr  error
	listErr  error
	listData []booking.Booking
}

func (f *fakeRepo) Save(_ context.Context, b booking.Booking) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.saveErr != nil {
		return f.saveErr
	}
	f.saved = append(f.saved, b)
	return nil
}

func (f *fakeRepo) List(_ context.Context) ([]booking.Booking, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.listErr != nil {
		return nil, f.listErr
	}
	return f.listData, nil
}

func fixedClock(t time.Time) func() time.Time { return func() time.Time { return t } }

func fixedID(id string) func() string { return func() string { return id } }

func TestService_Create_AutoApproves(t *testing.T) {
	repo := &fakeRepo{}
	fixed := time.Date(2026, 5, 22, 12, 0, 0, 0, time.UTC)
	svc := booking.NewService(repo,
		booking.WithClock(fixedClock(fixed)),
		booking.WithIDGenerator(fixedID("bk-1")),
	)

	got, err := svc.Create(context.Background(), booking.CreateInput{
		CourtName: " Court 1 ",
		TeamName:  "Goats FC",
		StartAt:   fixed.Add(1 * time.Hour),
		EndAt:     fixed.Add(2 * time.Hour),
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if got.ID != "bk-1" {
		t.Errorf("ID: got %q", got.ID)
	}
	if got.CourtName != "Court 1" {
		t.Errorf("CourtName trimmed wrong: %q", got.CourtName)
	}
	if got.Status != booking.StatusApproved {
		t.Errorf("Status: got %q, want %q", got.Status, booking.StatusApproved)
	}
	if !got.CreatedAt.Equal(fixed) {
		t.Errorf("CreatedAt: got %v, want %v", got.CreatedAt, fixed)
	}
	if len(repo.saved) != 1 {
		t.Fatalf("repo should have 1 saved booking, got %d", len(repo.saved))
	}
	if repo.saved[0].ID != "bk-1" {
		t.Errorf("repo saved wrong booking")
	}
}

func TestService_Create_RejectsEndBeforeOrEqualStart(t *testing.T) {
	cases := []struct {
		name             string
		start, end       time.Time
	}{
		{"end before start", time.Date(2026, 5, 22, 19, 0, 0, 0, time.UTC), time.Date(2026, 5, 22, 18, 0, 0, 0, time.UTC)},
		{"end equals start", time.Date(2026, 5, 22, 18, 0, 0, 0, time.UTC), time.Date(2026, 5, 22, 18, 0, 0, 0, time.UTC)},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			repo := &fakeRepo{}
			svc := booking.NewService(repo)
			_, err := svc.Create(context.Background(), booking.CreateInput{
				CourtName: "C", TeamName: "T",
				StartAt: tc.start, EndAt: tc.end,
			})
			if !errors.Is(err, booking.ErrInvalidTimeRange) {
				t.Fatalf("want ErrInvalidTimeRange, got %v", err)
			}
			if len(repo.saved) != 0 {
				t.Fatalf("repo should not have been called, has %d items", len(repo.saved))
			}
		})
	}
}

func TestService_Create_WrapsRepoError(t *testing.T) {
	repoErr := errors.New("boom")
	repo := &fakeRepo{saveErr: repoErr}
	svc := booking.NewService(repo)
	_, err := svc.Create(context.Background(), booking.CreateInput{
		CourtName: "C", TeamName: "T",
		StartAt: time.Now(), EndAt: time.Now().Add(time.Hour),
	})
	if !errors.Is(err, repoErr) {
		t.Fatalf("expected wrapped repo error, got %v", err)
	}
}

func TestService_List_PassesThrough(t *testing.T) {
	want := []booking.Booking{{ID: "1"}, {ID: "2"}}
	repo := &fakeRepo{listData: want}
	svc := booking.NewService(repo)
	got, err := svc.List(context.Background())
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 2 || got[0].ID != "1" || got[1].ID != "2" {
		t.Fatalf("unexpected result: %+v", got)
	}
}

func TestService_List_WrapsRepoError(t *testing.T) {
	repoErr := errors.New("boom")
	repo := &fakeRepo{listErr: repoErr}
	svc := booking.NewService(repo)
	_, err := svc.List(context.Background())
	if !errors.Is(err, repoErr) {
		t.Fatalf("expected wrapped repo error, got %v", err)
	}
}
