package booking

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type CreateInput struct {
	CourtName string
	TeamName  string
	StartAt   time.Time
	EndAt     time.Time
}

type Service struct {
	repo  Repository
	now   func() time.Time
	newID func() string
}

type Option func(*Service)

func WithClock(now func() time.Time) Option {
	return func(s *Service) { s.now = now }
}

func WithIDGenerator(newID func() string) Option {
	return func(s *Service) { s.newID = newID }
}

func NewService(repo Repository, opts ...Option) *Service {
	s := &Service{
		repo:  repo,
		now:   time.Now,
		newID: uuid.NewString,
	}
	for _, opt := range opts {
		opt(s)
	}
	return s
}

func (s *Service) Create(ctx context.Context, in CreateInput) (Booking, error) {
	if !in.EndAt.After(in.StartAt) {
		return Booking{}, ErrInvalidTimeRange
	}
	b := Booking{
		ID:        s.newID(),
		CourtName: strings.TrimSpace(in.CourtName),
		TeamName:  strings.TrimSpace(in.TeamName),
		StartAt:   in.StartAt.UTC(),
		EndAt:     in.EndAt.UTC(),
		Status:    StatusApproved,
		CreatedAt: s.now().UTC(),
	}
	if err := s.repo.Save(ctx, b); err != nil {
		return Booking{}, fmt.Errorf("save booking: %w", err)
	}
	return b, nil
}

func (s *Service) List(ctx context.Context) ([]Booking, error) {
	bs, err := s.repo.List(ctx)
	if err != nil {
		return nil, fmt.Errorf("list bookings: %w", err)
	}
	return bs, nil
}
