<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DateBooking extends Model
{
    use HasFactory;

    protected $fillable = [
        'proposer_id',
        'partner_id',
        'restaurant_id',
        'booking_date',
        'booking_time',
        'status',
    ];

    public function proposer()
    {
        return $this->belongsTo(User::class, 'proposer_id');
    }

    public function partner()
    {
        return $this->belongsTo(User::class, 'partner_id');
    }

    public function restaurant()
    {
        return $this->belongsTo(Restaurant::class);
    }
}
