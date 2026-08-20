<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'sender_id',
        'receiver_id',
        'message',
        'is_read',
        'deleted_by_sender',
        'deleted_by_receiver',
        'sender_reaction',
        'receiver_reaction',
        'reply_to_id',
        'reply_to_text',
        'reply_to_sender',
    ];

    protected $casts = [
        'is_read'             => 'boolean',
        'deleted_by_sender'   => 'boolean',
        'deleted_by_receiver' => 'boolean',
    ];

    protected $appends = [
        'reactions',
        'reaction',
    ];

    public function getReactionsAttribute()
    {
        $list = [];
        if ($this->sender_reaction) $list[] = $this->sender_reaction;
        if ($this->receiver_reaction) $list[] = $this->receiver_reaction;
        return array_values(array_unique($list));
    }

    public function getReactionAttribute()
    {
        // Combined display string of reactions (e.g. "❤️ 👍")
        $list = $this->getReactionsAttribute();
        return count($list) > 0 ? implode(' ', $list) : null;
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'receiver_id');
    }
}
