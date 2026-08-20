<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\ProfilePhoto;
use App\Models\Restaurant;
use App\Models\Message;
use App\Models\UserMatch;
use App\Models\Swipe;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ──────────────────────────────────────────────────────
        // 1. PRIMARY DEMO MALE USER (Alex Morgan — logs in with alex@heartlink.com)
        // ──────────────────────────────────────────────────────
        $alex = User::firstOrCreate(
            ['email' => 'alex@heartlink.com'],
            [
                'name'                => 'Alex Morgan',
                'password'            => Hash::make('password123'),
                'age'                 => 26,
                'gender'              => 'Male',
                'bio'                 => 'Architectural designer, coffee enthusiast, and weekend photographer. Always looking for the next great adventure.',
                'job'                 => 'Senior Architect',
                'avatar'              => 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'country'             => 'USA',
                'relationship_type'   => 'Long-term relationship',
                'compatibility_score' => 96,
                'interests'           => json_encode(['Architecture', 'Coffee', 'Design', 'Photography', 'Travel']),
            ]
        );

        $this->addPhotos($alex->id, [
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
        ]);

        // ──────────────────────────────────────────────────────
        // 1B. USER ACCOUNT: Prathamesh (prathamesh@gmail.com / 111111)
        // ──────────────────────────────────────────────────────
        $prathamesh = User::firstOrCreate(
            ['email' => 'prathamesh@gmail.com'],
            [
                'name'                => 'Prathamesh',
                'password'            => Hash::make('111111'),
                'age'                 => 25,
                'gender'              => 'Male',
                'bio'                 => 'Passionate tech enthusiast, coffee lover, and explorer looking for meaningful connections.',
                'job'                 => 'Software Engineer',
                'avatar'              => 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500',
                'city'                => 'Mumbai',
                'state'               => 'MH',
                'country'             => 'India',
                'relationship_type'   => 'Long-term relationship',
                'compatibility_score' => 98,
                'interests'           => json_encode(['Coding', 'Travel', 'Music', 'Fitness', 'Coffee']),
            ]
        );

        $this->addPhotos($prathamesh->id, [
            'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800',
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
        ]);

        // ──────────────────────────────────────────────────────
        // 2. PRIMARY DEMO FEMALE USER (Anjali — logs in with anjali@heartlink.com)
        //    Will see Male profiles on Discover
        // ──────────────────────────────────────────────────────
        $anjali = User::firstOrCreate(
            ['email' => 'anjali@heartlink.com'],
            [
                'name'                => 'Anjali Sharma',
                'password'            => Hash::make('password123'),
                'age'                 => 23,
                'gender'              => 'Female',
                'bio'                 => 'Passionate about literature, yoga, and exploring street food. Looking for someone who matches my vibe.',
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

        $this->addPhotos($anjali->id, [
            'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
            'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
        ]);

        // ──────────────────────────────────────────────────────
        // 2B. USER ACCOUNT: Anjali (anjali@gmail.com / 111111)
        // ──────────────────────────────────────────────────────
        $anjaliG = User::firstOrCreate(
            ['email' => 'anjali@gmail.com'],
            [
                'name'                => 'Anjali',
                'password'            => Hash::make('111111'),
                'age'                 => 24,
                'gender'              => 'Female',
                'bio'                 => 'Passionate about literature, art, and exploring street food. Looking for someone who matches my vibe.',
                'job'                 => 'Creative Designer',
                'avatar'              => 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=500',
                'city'                => 'Mumbai',
                'state'               => 'MH',
                'country'             => 'India',
                'relationship_type'   => 'Long-term relationship',
                'compatibility_score' => 95,
                'interests'           => json_encode(['Literature', 'Art', 'Design', 'Travel', 'Music']),
            ]
        );

        $this->addPhotos($anjaliG->id, [
            'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
        ]);

        // ──────────────────────────────────────────────────────
        // 3. FEMALE PROFILES (shown to Alex & other Male users on Discover)
        // ──────────────────────────────────────────────────────
        $femaleProfiles = [
            [
                'name'                => 'Sophia Carter',
                'email'               => 'sophia@example.com',
                'age'                 => 24,
                'gender'              => 'Female',
                'vibe'                => 'Art & Gallery',
                'job'                 => 'Creative Director',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'compatibility_score' => 94,
                'bio'                 => 'Living colorfully, one outfit at a time. Always chasing the next adventure, trying new coffee shops, and painting on weekends!',
                'interests'           => ['Design', 'Art', 'Coffee', 'Photography', 'Yoga'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
                    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
                    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
                ],
            ],
            [
                'name'                => 'Mia Rodriguez',
                'email'               => 'mia@example.com',
                'age'                 => 25,
                'gender'              => 'Female',
                'vibe'                => 'Tech & Dev',
                'job'                 => 'UX Researcher',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'compatibility_score' => 91,
                'bio'                 => 'Coding AI apps, UX research, reading sci-fi, and finding startup co-founders over matcha!',
                'interests'           => ['Tech', 'Coding', 'Developer', 'AI', 'UX', 'Sci-Fi', 'Coffee'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800',
                    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
                ],
            ],
            [
                'name'                => 'Zoe Martin',
                'email'               => 'zoe@example.com',
                'age'                 => 23,
                'gender'              => 'Female',
                'vibe'                => 'Late Night Beats',
                'job'                 => 'Fashion Stylist',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'compatibility_score' => 89,
                'bio'                 => 'Vibe enthusiast. Vintage clothes collector, vinyl spinner, lo-fi beats listener, and passionate foodie.',
                'interests'           => ['Fashion', 'Vintage', 'Vinyl', 'Music', 'Beats', 'Foodie', 'Art'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800',
                    'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800',
                ],
            ],
            [
                'name'                => 'Lily Chen',
                'email'               => 'lily@example.com',
                'age'                 => 26,
                'gender'              => 'Female',
                'vibe'                => 'Cafe Hop',
                'job'                 => 'Graphic Designer',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'compatibility_score' => 88,
                'bio'                 => 'Typography nerd and matcha lover. Minimalist coffee brewing, vintage novels, and weekend cafe hops are my things.',
                'interests'           => ['Design', 'Cafe', 'Coffee', 'Books', 'Matcha', 'Vinyl'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1530268729831-4b0b9e170218?w=800',
                    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800',
                ],
            ],
            [
                'name'                => 'Aria Sterling',
                'email'               => 'aria@example.com',
                'age'                 => 22,
                'gender'              => 'Female',
                'vibe'                => 'Foodie Club',
                'job'                 => 'Marketing Manager',
                'city'                => 'Evanston',
                'state'               => 'IL',
                'compatibility_score' => 92,
                'bio'                 => 'Brand storyteller by day, amateur chef by night. Passionate about culinary arts, gourmet spices, and food tasting tours.',
                'interests'           => ['Food', 'Foodie', 'Cooking', 'Chef', 'Travel', 'Yoga'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800',
                    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
                ],
            ],
            [
                'name'                => 'Samirokta Rachin',
                'email'               => 'samirokta@example.com',
                'age'                 => 25,
                'gender'              => 'Female',
                'vibe'                => 'Wanderlust',
                'job'                 => 'Fashion Model',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'compatibility_score' => 95,
                'bio'                 => 'Living colorfully, one flight ticket at a time. Exploring tropical beaches, roadtrips, and new cultures worldwide!',
                'interests'           => ['Travel', 'Wanderlust', 'Adventure', 'Flight', 'Fashion', 'Photography'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
                    'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800',
                ],
            ],
            [
                'name'                => 'Isabella Ross',
                'email'               => 'isabella@example.com',
                'age'                 => 24,
                'gender'              => 'Female',
                'vibe'                => 'Cinephile',
                'job'                 => 'Interior Designer',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'compatibility_score' => 90,
                'bio'                 => 'Creating cozy aesthetic spaces. Indie cinema binge-watcher, film critic, architectural tours, and artisan bakeries.',
                'interests'           => ['Film', 'Cinema', 'Movie', 'Design', 'Architecture', 'Plants'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
                    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
                ],
            ],
            [
                'name'                => 'Chloe Bennett',
                'email'               => 'chloe@example.com',
                'age'                 => 23,
                'gender'              => 'Female',
                'vibe'                => 'Fitness Fit',
                'job'                 => 'Event Strategist',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'compatibility_score' => 93,
                'bio'                 => 'Gym enthusiast, marathon runner, live music festival goer, and lover of beach volleyball workouts.',
                'interests'           => ['Gym', 'Fitness', 'Workout', 'Running', 'Volleyball', 'Music'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
                    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
                ],
            ],
            [
                'name'                => 'Emma Watson',
                'email'               => 'emma@example.com',
                'age'                 => 25,
                'gender'              => 'Female',
                'vibe'                => 'Nature Peak',
                'job'                 => 'Environmental Scientist',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'compatibility_score' => 96,
                'bio'                 => 'Exploring mountain trails, camping under stars, reading classic novels, and sipping chai on rainy afternoons.',
                'interests'           => ['Nature', 'Hiking', 'Camping', 'Trail', 'Outdoor', 'Books'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800',
                    'https://images.unsplash.com/photo-1530268729831-4b0b9e170218?w=800',
                ],
            ],
            [
                'name'                => 'Kira Tanaka',
                'email'               => 'kira@example.com',
                'age'                 => 22,
                'gender'              => 'Female',
                'vibe'                => 'Gamer Zone',
                'job'                 => 'Game Streamer & Animator',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'compatibility_score' => 94,
                'bio'                 => 'Streaming retro RPGs, anime marathon sessions, PS5 multiplayer raids, and collecting custom keyboards.',
                'interests'           => ['Gaming', 'Game', 'Esports', 'Anime', 'Console', 'Retro'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
                    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
                ],
            ],
            [
                'name'                => 'Elena Rostova',
                'email'               => 'elena@example.com',
                'age'                 => 24,
                'gender'              => 'Female',
                'vibe'                => 'Pet Lover',
                'job'                 => 'Veterinary Assistant',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'compatibility_score' => 95,
                'bio'                 => 'Dog mom of two golden retrievers! Fostering kittens, weekend dog park meetups, and animal welfare advocacy.',
                'interests'           => ['Pet', 'Dog', 'Cat', 'Animal', 'Pup', 'Foster'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
                    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
                ],
            ],
            [
                'name'                => 'Luna Celeste',
                'email'               => 'luna@example.com',
                'age'                 => 23,
                'gender'              => 'Female',
                'vibe'                => 'Star Gazer',
                'job'                 => 'Astrophysics Student',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'compatibility_score' => 97,
                'bio'                 => 'Stargazing with high-powered telescopes, celestial photography, cosmos documentaries, and night drives.',
                'interests'           => ['Star', 'Astronomy', 'Space', 'Galaxy', 'Telescope', 'Cosmos'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
                    'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800',
                ],
            ],
            // Additional Multi-Vibe Female Profiles to ensure rich database results for every vibe
            [
                'name'                => 'Maya Lin',
                'email'               => 'mayalin@example.com',
                'age'                 => 24,
                'gender'              => 'Female',
                'vibe'                => 'Late Night Beats',
                'job'                 => 'Sound Engineer',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'compatibility_score' => 92,
                'bio'                 => 'Mixing lo-fi tracks, late night studio sessions, vinyl collecting, and electronic music festivals.',
                'interests'           => ['Music', 'Vinyl', 'Lo-Fi', 'Concert', 'Jazz', 'Beats'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
                    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
                ],
            ],
            [
                'name'                => 'Hannah Abbott',
                'email'               => 'hannah@example.com',
                'age'                 => 25,
                'gender'              => 'Female',
                'vibe'                => 'Cafe Hop',
                'job'                 => 'Barista & Writer',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'compatibility_score' => 90,
                'bio'                 => 'Artisanal coffee brewing, bookstore dates, cozy corner cafes, and writing poetry.',
                'interests'           => ['Coffee', 'Cafe', 'Book', 'Reading', 'Tea', 'Brew'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
                    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800',
                ],
            ],
            [
                'name'                => 'Samantha Reed',
                'email'               => 'samantha@example.com',
                'age'                 => 26,
                'gender'              => 'Female',
                'vibe'                => 'Nature Peak',
                'job'                 => 'Outdoor Guide',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'compatibility_score' => 94,
                'bio'                 => 'Highland trekking, rock climbing, campfire stargazing, and national park road trips.',
                'interests'           => ['Hiking', 'Nature', 'Camping', 'Trail', 'Outdoor', 'Climbing'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
                    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800',
                ],
            ],
            [
                'name'                => 'Jessica Pixel',
                'email'               => 'jessica@example.com',
                'age'                 => 23,
                'gender'              => 'Female',
                'vibe'                => 'Gamer Zone',
                'job'                 => 'Game Designer',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'compatibility_score' => 93,
                'bio'                 => 'Designing 2D platformers, PC master race builds, Fighting game tournaments, and anime.',
                'interests'           => ['Gaming', 'Game', 'Esport', 'Anime', 'Console', 'Retro'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800',
                    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800',
                ],
            ],
            [
                'name'                => 'Priyanka Sharma',
                'email'               => 'priyanka@example.com',
                'age'                 => 25,
                'gender'              => 'Female',
                'vibe'                => 'Tech & Dev',
                'job'                 => 'Software Engineer',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'compatibility_score' => 96,
                'bio'                 => 'Building scalable backend microservices, AI prompt engineering, hackathons, and tech startups.',
                'interests'           => ['Tech', 'Coding', 'Programming', 'AI', 'Startup', 'Developer'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
                    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
                ],
            ],
            [
                'name'                => 'Victoria Gourmet',
                'email'               => 'victoria@example.com',
                'age'                 => 26,
                'gender'              => 'Female',
                'vibe'                => 'Foodie Club',
                'job'                 => 'Pastry Chef',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'compatibility_score' => 95,
                'bio'                 => 'Michelin star restaurant hunter, baking sourdough bread, wine tasting, and global food culture.',
                'interests'           => ['Food', 'Cooking', 'Foodie', 'Chef', 'Restaurant', 'Baking'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
                    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
                ],
            ],
            [
                'name'                => 'Natasha Iron',
                'email'               => 'natasha@example.com',
                'age'                 => 24,
                'gender'              => 'Female',
                'vibe'                => 'Fitness Fit',
                'job'                 => 'Fitness Trainer',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'compatibility_score' => 91,
                'bio'                 => 'Crossfit enthusiast, powerlifting, morning yoga flow, and healthy meal prep routines.',
                'interests'           => ['Fitness', 'Gym', 'Yoga', 'Running', 'Workout', 'Sport'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800',
                    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
                ],
            ],
            [
                'name'                => 'Audrey Film',
                'email'               => 'audrey@example.com',
                'age'                 => 25,
                'gender'              => 'Female',
                'vibe'                => 'Cinephile',
                'job'                 => 'Film Producer',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'compatibility_score' => 92,
                'bio'                 => '35mm film projection, festival indie films, A24 movies, and screenwriting workshops.',
                'interests'           => ['Movie', 'Cinema', 'Film', 'Series', 'Netflix', 'Watch'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1530268729831-4b0b9e170218?w=800',
                    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800',
                ],
            ],
            [
                'name'                => 'Clara Monet',
                'email'               => 'clara@example.com',
                'age'                 => 24,
                'gender'              => 'Female',
                'vibe'                => 'Art & Gallery',
                'job'                 => 'Museum Curator',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'compatibility_score' => 91,
                'bio'                 => 'Abstract painting, modern art galleries, sculpture exhibitions, and pottery classes.',
                'interests'           => ['Art', 'Gallery', 'Painting', 'Design', 'Sculpture'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
                    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
                ],
            ],
            [
                'name'                => 'Jessica Nomad',
                'email'               => 'jessicanomad@example.com',
                'age'                 => 26,
                'gender'              => 'Female',
                'vibe'                => 'Wanderlust',
                'job'                 => 'Travel Photographer',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'compatibility_score' => 96,
                'bio'                 => 'Backpacking across South America, road trips through national parks, and capturing sunsets.',
                'interests'           => ['Travel', 'Wanderlust', 'Backpacking', 'Adventure', 'Flight'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
                    'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800',
                ],
            ],
            [
                'name'                => 'Grace Puppy',
                'email'               => 'gracepuppy@example.com',
                'age'                 => 23,
                'gender'              => 'Female',
                'vibe'                => 'Pet Lover',
                'job'                 => 'Dog Groomer',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'compatibility_score' => 93,
                'bio'                 => 'Rescuing stray pups, dog agility training, weekend pet cafes, and cozy animal volunteering.',
                'interests'           => ['Pet', 'Dog', 'Cat', 'Animal', 'Pup', 'Foster'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
                    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
                ],
            ],
            [
                'name'                => 'Stella Cosmos',
                'email'               => 'stella@example.com',
                'age'                 => 25,
                'gender'              => 'Female',
                'vibe'                => 'Star Gazer',
                'job'                 => 'Planetarium Presenter',
                'city'                => 'Chicago',
                'state'               => 'IL',
                'compatibility_score' => 95,
                'bio'                 => 'Constellation mapping, stargazing events, space exploration history, and meteor shower watching.',
                'interests'           => ['Star', 'Astronomy', 'Space', 'Galaxy', 'Telescope'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800',
                    'https://images.unsplash.com/photo-1530268729831-4b0b9e170218?w=800',
                ],
            ],
        ];

        $femaleUsers = [];
        foreach ($femaleProfiles as $pData) {
            $photos = $pData['photos'];
            unset($pData['photos']);

            $user = User::firstOrCreate(
                ['email' => $pData['email']],
                array_merge($pData, [
                    'password'  => Hash::make('password123'),
                    'avatar'    => $photos[0],
                    'country'   => 'USA',
                    'relationship_type' => 'Long-term relationship',
                    'interests' => json_encode($pData['interests']),
                ])
            );
            $this->addPhotos($user->id, $photos);
            $femaleUsers[] = $user;
        }

        // ──────────────────────────────────────────────────────
        // 4. MALE PROFILES (shown to Anjali & other Female users on Discover)
        // ──────────────────────────────────────────────────────
        $maleProfiles = [
            [
                'name'                => 'Rahul Verma',
                'email'               => 'rahul@example.com',
                'age'                 => 27,
                'gender'              => 'Male',
                'vibe'                => 'Tech & Dev',
                'job'                 => 'Software Engineer',
                'city'                => 'Mumbai',
                'state'               => 'MH',
                'compatibility_score' => 91,
                'bio'                 => 'Building fullstack apps and AI models. Rock climber on weekends, tech developer every day.',
                'interests'           => ['Tech', 'Coding', 'Developer', 'AI', 'Software', 'Rock Climbing', 'Jazz'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800',
                    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
                ],
            ],
            [
                'name'                => 'James Whitfield',
                'email'               => 'james@example.com',
                'age'                 => 28,
                'gender'              => 'Male',
                'vibe'                => 'Star Gazer',
                'job'                 => 'Product Manager',
                'city'                => 'Mumbai',
                'state'               => 'MH',
                'compatibility_score' => 88,
                'bio'                 => 'Astrophysics enthusiast & telescope owner. Hiking trails and stargazing under night skies are my weekend essentials.',
                'interests'           => ['Star', 'Astronomy', 'Space', 'Telescope', 'Hiking', 'Mixology', 'Music'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
                    'https://images.unsplash.com/photo-1463453091185-61582044d556?w=800',
                ],
            ],
            [
                'name'                => 'Arjun Kapoor',
                'email'               => 'arjun@example.com',
                'age'                 => 25,
                'gender'              => 'Male',
                'vibe'                => 'Gamer Zone',
                'job'                 => 'Photographer',
                'city'                => 'Pune',
                'state'               => 'MH',
                'compatibility_score' => 95,
                'bio'                 => 'Retro gaming, console esports tournaments, street photography, golden hour, and chai conversations are life.',
                'interests'           => ['Gaming', 'Game', 'Esports', 'Console', 'Photography', 'Chai', 'Cinema'],
                'photos'              => [
                    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800',
                    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800',
                ],
            ],
        ];

        $maleUsers = [];
        foreach ($maleProfiles as $pData) {
            $photos = $pData['photos'];
            unset($pData['photos']);

            $user = User::firstOrCreate(
                ['email' => $pData['email']],
                array_merge($pData, [
                    'password'          => Hash::make('password123'),
                    'avatar'            => $photos[0],
                    'country'           => 'India',
                    'relationship_type' => 'Long-term relationship',
                    'interests'         => json_encode($pData['interests']),
                ])
            );
            $this->addPhotos($user->id, $photos);
            $maleUsers[] = $user;
        }

        // ──────────────────────────────────────────────────────
        // 5. SWIPES → Requests Screen
        //    Rahul & James liked Anjali  → shows on Anjali's Requests tab
        //    Sophia liked Alex           → shows on Alex's Requests tab
        //    Mia liked Alex              → shows on Alex's Requests tab
        // ──────────────────────────────────────────────────────
        $this->swipe($maleUsers[0]->id, $anjali->id, 'like'); // Rahul → Anjali
        $this->swipe($maleUsers[1]->id, $anjali->id, 'like'); // James → Anjali
        $this->swipe($femaleUsers[0]->id, $alex->id, 'like'); // Sophia → Alex
        $this->swipe($femaleUsers[1]->id, $alex->id, 'like'); // Mia → Alex

        // Seed incoming swipes for Prathamesh (prathamesh@gmail.com) & Anjali (anjali@gmail.com)
        if (isset($femaleUsers[0])) $this->swipe($femaleUsers[0]->id, $prathamesh->id, 'super_like'); // Sophia → Prathamesh
        if (isset($femaleUsers[1])) $this->swipe($femaleUsers[1]->id, $prathamesh->id, 'like');       // Mia → Prathamesh
        if (isset($femaleUsers[2])) $this->swipe($femaleUsers[2]->id, $prathamesh->id, 'like');       // Zoe → Prathamesh

        if (isset($maleUsers[0])) $this->swipe($maleUsers[0]->id, $anjaliG->id, 'super_like'); // Rahul → Anjali
        if (isset($maleUsers[1])) $this->swipe($maleUsers[1]->id, $anjaliG->id, 'like');       // James → Anjali

        // ──────────────────────────────────────────────────────
        // 6. MUTUAL MATCHES + MESSAGES → Matches & Chat screens
        //    Alex ↔ Sophia (matched + conversation)
        //    Anjali ↔ Arjun (matched + conversation)
        // ──────────────────────────────────────────────────────
        $sophia = $femaleUsers[0];
        $arjun  = $maleUsers[2];

        // Alex ↔ Sophia match
        $this->swipe($alex->id, $sophia->id, 'like');
        $this->swipe($sophia->id, $alex->id, 'like');
        $this->createMatch($alex->id, $sophia->id);

        Message::create(['sender_id' => $sophia->id, 'receiver_id' => $alex->id, 'message' => "Hey Alex! I love your architecture portfolio.", 'is_read' => true]);
        Message::create(['sender_id' => $alex->id,   'receiver_id' => $sophia->id, 'message' => "Thanks Sophia! Your creative work is stunning too.", 'is_read' => true]);
        Message::create(['sender_id' => $sophia->id, 'receiver_id' => $alex->id, 'message' => "We should grab coffee and talk design sometime!", 'is_read' => true]);
        Message::create(['sender_id' => $alex->id,   'receiver_id' => $sophia->id, 'message' => "Absolutely! This weekend works for me. You?", 'is_read' => false]);

        // Anjali ↔ Arjun match
        $this->swipe($anjali->id, $arjun->id, 'like');
        $this->swipe($arjun->id, $anjali->id, 'like');
        $this->createMatch($anjali->id, $arjun->id);

        Message::create(['sender_id' => $arjun->id,  'receiver_id' => $anjali->id, 'message' => "Hi Anjali! Loved your profile. Your taste in music is amazing.", 'is_read' => true]);
        Message::create(['sender_id' => $anjali->id, 'receiver_id' => $arjun->id,  'message' => "Haha thank you! Your photography is incredible. The golden hour shots especially!", 'is_read' => true]);
        Message::create(['sender_id' => $arjun->id,  'receiver_id' => $anjali->id, 'message' => "Would love to show you some locations sometime. Know any good chai spots?", 'is_read' => false]);

        // Alex ↔ Zoe match (no messages yet — shows in matches but empty chat)
        $zoe = $femaleUsers[2];
        $this->swipe($alex->id, $zoe->id, 'like');
        $this->swipe($zoe->id, $alex->id, 'like');
        $this->createMatch($alex->id, $zoe->id);

        // ──────────────────────────────────────────────────────
        // 7. DATE RESTAURANTS → Date Planner screen
        // ──────────────────────────────────────────────────────
        $restaurants = [
            [
                'name'        => 'LUMA Rooftop Lounge',
                'category'    => 'Cocktail Bar & Tapas',
                'rating'      => 4.9,
                'location'    => 'Downtown Waterfront',
                'image'       => 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
                'description' => 'Panoramic skyline views, crafted botanical cocktails, and live jazz vibes under starry skies. Perfect for a first date or anniversary.',
                'price_range' => '$$$',
                'map_url'     => 'https://maps.google.com/?q=LUMA+Rooftop+Chicago',
                'is_boosted'  => true,
            ],
            [
                'name'        => 'Starlight Skybar & Lounge',
                'category'    => 'Cosmic Rooftop & Mixology',
                'rating'      => 4.95,
                'location'    => 'Marina Bay Waterfront',
                'image'       => 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800',
                'description' => 'Ultra-luxe rooftop deck with stargazing telescopes, neon infinity pools, and signature molecular cocktails.',
                'price_range' => '$$$$',
                'map_url'     => 'https://maps.google.com/?q=Starlight+Skybar',
                'is_boosted'  => true,
            ],
            [
                'name'        => 'Aura Garden Bistro',
                'category'    => 'Organic Italian',
                'rating'      => 4.8,
                'location'    => 'West Loop Arts District',
                'image'       => 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
                'description' => 'Enchanted courtyard dining with glowing fairy lights, handmade pasta, and organic wine pairings.',
                'price_range' => '$$',
                'map_url'     => 'https://maps.google.com/?q=Aura+Garden+Bistro',
            ],
            [
                'name'        => 'Velvet & Smoke',
                'category'    => 'Speakeasy & Steakhouse',
                'rating'      => 4.7,
                'location'    => 'Old Town Historic',
                'image'       => 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800',
                'description' => 'Hidden entrance behind a bookshelf. Dim plush leather booths and artisan smoked bourbon cocktails.',
                'price_range' => '$$$$',
                'map_url'     => 'https://maps.google.com/?q=Velvet+Smoke+Chicago',
            ],
            [
                'name'        => 'La Maison du Soir',
                'category'    => 'French Fine Dining',
                'rating'      => 4.9,
                'location'    => 'Gold Coast',
                'image'       => 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
                'description' => 'Classic French haute cuisine in an intimate setting with candle-lit tables and a sommelier on staff.',
                'price_range' => '$$$$',
                'map_url'     => 'https://maps.google.com/?q=La+Maison+du+Soir+Chicago',
            ],
            [
                'name'        => 'Sakura Omakase Bar',
                'category'    => 'Japanese Omakase',
                'rating'      => 5.0,
                'location'    => 'River North',
                'image'       => 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800',
                'description' => 'Chef-curated 12-course sushi experience with seasonal imports from Tsukiji. Intimate counter seating for two.',
                'price_range' => '$$$$',
                'map_url'     => 'https://maps.google.com/?q=Sakura+Omakase+Chicago',
            ],
            [
                'name'        => 'The Lantern Terrace',
                'category'    => 'Mediterranean Rooftop',
                'rating'      => 4.6,
                'location'    => 'Lincoln Park',
                'image'       => 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800',
                'description' => 'Open-air Mediterranean mezze under hanging lanterns. Warm spices, chilled rose, and live oud music on Fridays.',
                'price_range' => '$$$',
                'map_url'     => 'https://maps.google.com/?q=The+Lantern+Terrace+Chicago',
            ],
        ];

        foreach ($restaurants as $r) {
            Restaurant::firstOrCreate(['name' => $r['name']], $r);
        }

        $this->command->info('HeartLink test data seeded successfully!');
        $this->command->info('Male login: alex@heartlink.com / password123');
        $this->command->info('Female login: anjali@heartlink.com / password123');
    }

    private function addPhotos(int $userId, array $photos): void
    {
        ProfilePhoto::where('user_id', $userId)->delete();
        foreach ($photos as $idx => $url) {
            ProfilePhoto::create([
                'user_id'    => $userId,
                'photo_url'  => $url,
                'is_primary' => $idx === 0,
                'sort_order' => $idx,
            ]);
        }
    }

    private function swipe(int $swiperId, int $swipedId, string $type): void
    {
        Swipe::firstOrCreate(
            ['swiper_id' => $swiperId, 'swiped_user_id' => $swipedId],
            ['type' => $type]
        );
    }

    private function createMatch(int $user1, int $user2): void
    {
        UserMatch::firstOrCreate([
            'user_1_id' => min($user1, $user2),
            'user_2_id' => max($user1, $user2),
        ], [
            'matched_at' => now(),
        ]);
    }
}
