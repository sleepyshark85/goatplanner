package httpapi

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/go-chi/chi/v5/middleware"

	"goatplanner/internal/booking"
)

// BookingService is the inbound port the HTTP adapter depends on.
// The concrete *booking.Service satisfies this interface, but tests
// can pass a fake.
type BookingService interface {
	Create(ctx context.Context, in booking.CreateInput) (booking.Booking, error)
	List(ctx context.Context) ([]booking.Booking, error)
}

type bookingResponse struct {
	ID        string    `json:"id" format:"uuid" doc:"Unique booking identifier (UUID v4)"`
	CourtName string    `json:"court_name" doc:"Name of the court"`
	TeamName  string    `json:"team_name" doc:"Name of the team"`
	StartAt   time.Time `json:"start_at" format:"date-time" doc:"Start time in UTC (RFC3339)"`
	EndAt     time.Time `json:"end_at" format:"date-time" doc:"End time in UTC (RFC3339)"`
	Status    string    `json:"status" enum:"APPROVED" doc:"Lifecycle status"`
	CreatedAt time.Time `json:"created_at" format:"date-time" doc:"When the booking was created (UTC)"`
}

func toResponse(b booking.Booking) bookingResponse {
	return bookingResponse{
		ID:        b.ID,
		CourtName: b.CourtName,
		TeamName:  b.TeamName,
		StartAt:   b.StartAt,
		EndAt:     b.EndAt,
		Status:    string(b.Status),
		CreatedAt: b.CreatedAt,
	}
}

type listBookingsOutput struct {
	Body []bookingResponse
}

type createBookingInput struct {
	Body struct {
		CourtName string    `json:"court_name" required:"true" minLength:"1" maxLength:"100" doc:"Name of the court"`
		TeamName  string    `json:"team_name"  required:"true" minLength:"1" maxLength:"100" doc:"Name of the team"`
		StartAt   time.Time `json:"start_at"   required:"true" format:"date-time" doc:"Start time (RFC3339)"`
		EndAt     time.Time `json:"end_at"     required:"true" format:"date-time" doc:"End time (RFC3339, must be after start_at)"`
	}
}

type createBookingOutput struct {
	Body bookingResponse
}

type bookingsHandler struct {
	svc    BookingService
	logger *slog.Logger
}

func (h *bookingsHandler) list(ctx context.Context, _ *struct{}) (*listBookingsOutput, error) {
	bs, err := h.svc.List(ctx)
	if err != nil {
		h.logError(ctx, "list bookings failed", err)
		return nil, huma.Error500InternalServerError("internal error")
	}
	out := make([]bookingResponse, 0, len(bs))
	for _, b := range bs {
		out = append(out, toResponse(b))
	}
	return &listBookingsOutput{Body: out}, nil
}

func (h *bookingsHandler) create(ctx context.Context, input *createBookingInput) (*createBookingOutput, error) {
	b, err := h.svc.Create(ctx, booking.CreateInput{
		CourtName: input.Body.CourtName,
		TeamName:  input.Body.TeamName,
		StartAt:   input.Body.StartAt,
		EndAt:     input.Body.EndAt,
	})
	if err != nil {
		if errors.Is(err, booking.ErrInvalidTimeRange) {
			return nil, huma.Error400BadRequest(err.Error())
		}
		h.logError(ctx, "create booking failed", err)
		return nil, huma.Error500InternalServerError("internal error")
	}
	return &createBookingOutput{Body: toResponse(b)}, nil
}

func (h *bookingsHandler) logError(ctx context.Context, msg string, err error) {
	h.logger.ErrorContext(ctx, msg,
		slog.String("err", err.Error()),
		slog.String("request_id", middleware.GetReqID(ctx)),
	)
}
