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
        'verified_at' => 'datetime',
    ];

    public function setRawResponseAttribute($value)
    {
        $this->attributes['raw_response'] = is_string($value) ? $value : json_encode($value);
    }

    public function getRawResponseAttribute($value)
    {
        if (empty($value)) {
            return null;
        }
        $decoded = json_decode($value, true);
        return (json_last_error() === JSON_ERROR_NONE) ? $decoded : $value;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
