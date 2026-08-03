<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\ProfilePhoto;

class CreateSpecificUsersSeeder extends Seeder
{
    public function run(): void
    {
        // ── Anjali Sharma — Female ──────────────────────────────────
        $anjali = User::firstOrCreate(
            ['email' => 'anjali@gmail.com'],
            [
                'name'                => 'Anjali Sharma',
                'password'            => Hash::make('111111'),
                'age'                 => 23,
                'gender'              => 'Female',
                'bio'                 => 'Passionate about literature, yoga, and exploring street food. Looking for someone who truly matches my vibe.',
                'job'                 => 'Content Creator',
                'avatar'              => 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=500',
                'city'                => 'Mumbai',
                'state'               => 'MH',
                'country'             => 'India',
                'relationship_type'   => 'Long-term relationship',
                'compatibility_score' => 93,
                'interests'           => json_encode(['Literature', 'Yoga', 'Street Food', 'Travel', 'Music']),
            ]
        );

        // Photos for Anjali
        $anjaliPhotos = [
            'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
            'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
        ];
        ProfilePhoto::where('user_id', $anjali->id)->delete();
        foreach ($anjaliPhotos as $idx => $url) {
            ProfilePhoto::create([
                'user_id'    => $anjali->id,
                'photo_url'  => $url,
                'is_primary' => $idx === 0,
                'sort_order' => $idx,
            ]);
        }

        // ── Prathamesh Ainwale — Male ──────────────────────────────
        $prath = User::firstOrCreate(
            ['email' => 'prathamesh@gmail.com'],
            [
                'name'                => 'Prathamesh Ainwale',
                'password'            => Hash::make('111111'),
                'age'                 => 24,
                'gender'              => 'Male',
                'bio'                 => 'Tech enthusiast and coffee lover. I enjoy hiking, photography, and good conversations over chai.',
                'job'                 => 'Software Developer',
                'avatar'              => 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500',
                'city'                => 'Pune',
                'state'               => 'MH',
                'country'             => 'India',
                'relationship_type'   => 'Long-term relationship',
                'compatibility_score' => 90,
                'interests'           => json_encode(['Technology', 'Coffee', 'Hiking', 'Photography', 'Chai']),
            ]
        );

        // Photos for Prathamesh
        $prathPhotos = [
            'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800',
            'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800',
            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800',
        ];
        ProfilePhoto::where('user_id', $prath->id)->delete();
        foreach ($prathPhotos as $idx => $url) {
            ProfilePhoto::create([
                'user_id'    => $prath->id,
                'photo_url'  => $url,
                'is_primary' => $idx === 0,
                'sort_order' => $idx,
            ]);
        }

        $this->command->info("Created anjali@gmail.com (Female) — ID: {$anjali->id}");
        $this->command->info("Created prathamesh@gmail.com (Male) — ID: {$prath->id}");
    }
}
