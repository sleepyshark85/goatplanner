package booking

import "context"

type Repository interface {
	Save(ctx context.Context, b Booking) error
	List(ctx context.Context) ([]Booking, error)
}
