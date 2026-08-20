<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AadhaarVerification extends Model
{
    use HasFactory;

    protected $table = 'aadhaar_verifications';

    protected $fillable = [
        'user_id',
        'aadhaar_number',
        'reference_id',
        'full_name',
        'gender',
        'date_of_birth',
        'year_of_birth',
        'care_of',
        'full_address',
        'house',
        'street',
        'vtc',
        'district',
        'state',
        'pincode',
        'country',
        'photo',
        'raw_response',
        'status',
        'verified_at',
    ];

    protected $casts = [
        'raw_response' => 'array',
        'verified_at'  => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
