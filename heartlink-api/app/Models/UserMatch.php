<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserMatch extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_1_id',
        'user_2_id',
        'matched_at',
    ];

    public function user1()
    {
        return $this->belongsTo(User::class, 'user_1_id');
    }

    public function user2()
    {
        return $this->belongsTo(User::class, 'user_2_id');
    }
}
