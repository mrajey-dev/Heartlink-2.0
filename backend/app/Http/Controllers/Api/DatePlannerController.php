<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use App\Models\DateBooking;
use Illuminate\Http\Request;

class DatePlannerController extends Controller
{
    public function getRestaurants()
    {
        $restaurants = Restaurant::all();

        return response()->json([
            'restaurants' => $restaurants,
        ]);
    }

    public function createProposal(Request $request)
    {
        $validated = $request->validate([
            'partner_id'    => 'required|exists:users,id',
            'restaurant_id' => 'required|exists:restaurants,id',
            'booking_date'  => 'required',
            'booking_time'  => 'required|string',
        ]);

        $proposerId = $request->user()->id;

        $rawDate = $validated['booking_date'];
        try {
            $formattedDate = \Carbon\Carbon::parse($rawDate)->format('Y-m-d');
        } catch (\Throwable $e) {
            $formattedDate = date('Y-m-d', strtotime($rawDate)) ?: now()->format('Y-m-d');
        }

        $booking = DateBooking::create([
            'proposer_id'   => $proposerId,
            'partner_id'    => $validated['partner_id'],
            'restaurant_id' => $validated['restaurant_id'],
            'booking_date'  => $formattedDate,
            'booking_time'  => $validated['booking_time'],
            'status'        => 'pending',
        ]);

        // Send in-app notification to receiver (partner)
        $proposer = $request->user();
        $proposerName = !empty($proposer->display_name) ? $proposer->display_name : $proposer->name;
        $restaurant = Restaurant::find($validated['restaurant_id']);
        $restaurantName = $restaurant ? $restaurant->name : 'a date spot';

        \App\Models\Notification::create([
            'user_id'      => $validated['partner_id'],
            'from_user_id' => $proposerId,
            'type'         => 'date_proposal',
            'message'      => "{$proposerName} invited you on a date at {$restaurantName}!",
            'is_read'      => false,
        ]);

        return response()->json([
            'message' => 'Date proposal sent successfully! 🥂',
            'booking' => $booking->load('restaurant', 'partner'),
        ], 201);
    }

    public function respondProposal(Request $request)
    {
        $validated = $request->validate([
            'booking_id' => 'required|exists:date_bookings,id',
            'status'     => 'required|in:accepted,rejected,declined',
        ]);

        $userId = $request->user()->id;
        $booking = DateBooking::where('id', $validated['booking_id'])
            ->where('partner_id', $userId)
            ->first();

        if (!$booking) {
            return response()->json(['message' => 'Date proposal not found or access denied.'], 404);
        }

        $newStatus = in_array($validated['status'], ['rejected', 'declined']) ? 'declined' : 'accepted';
        $booking->update(['status' => $newStatus]);

        // Send in-app notification to proposer
        $partner = $request->user();
        $partnerName = !empty($partner->display_name) ? $partner->display_name : $partner->name;
        $msg = $newStatus === 'accepted'
            ? "{$partnerName} has accepted your date proposal!"
            : "{$partnerName} has declined your date proposal.";

        \App\Models\Notification::create([
            'user_id'      => $booking->proposer_id,
            'from_user_id' => $userId,
            'type'         => 'date_response',
            'message'      => $msg,
            'is_read'      => false,
        ]);

        return response()->json([
            'message' => "Date proposal {$newStatus} successfully!",
            'booking' => $booking->load('restaurant', 'proposer', 'partner'),
        ]);
    }
}
