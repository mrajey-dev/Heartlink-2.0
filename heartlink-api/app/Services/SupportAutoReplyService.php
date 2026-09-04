<?php

namespace App\Services;

use App\Models\User;

class SupportAutoReplyService
{
    /**
     * Generate a personalized auto-reply for HeartLink Support messages.
     *
     * @param User   $user
     * @param string $incomingMessage
     * @return string
     */
    public function generateReply(User $user, string $incomingMessage): string
    {
        // Extract target user's preferred first name
        $fullName = trim($user->display_name ?: ($user->name ?: ''));
        if (!empty($fullName)) {
            $parts = preg_split('/\s+/', $fullName);
            $firstName = !empty($parts[0]) ? ucfirst(strtolower($parts[0])) : 'there';
        } else {
            $firstName = 'there';
        }

        $raw = trim($incomingMessage);
        $cleanText = preg_replace('/\[image\].*?\[\/image\]/is', '', $raw);
        $cleanText = trim($cleanText);
        $lower = strtolower($cleanText);

        $hasImage = preg_match('/\[image\].*?\[\/image\]/i', $raw) ||
                    preg_match('/^https?:\/\/.*\.(jpeg|jpg|png|webp|gif)(\?.*)?$/i', $raw);

        // Case 1: Image only message (screenshot/photo submitted)
        if ($hasImage && empty($cleanText)) {
            return "Thank you for sharing the attachment, {$firstName}! 📸\n\nOur customer support and safety team has received your screenshot and is reviewing it. If this is regarding a payment issue, profile verification, or a safety report, we will update you right here within a few moments.";
        }

        // Case 2: Greetings
        if ($this->matchesGreeting($lower)) {
            return "Hello {$firstName}! 👋 Welcome to Heart Link Customer Support.\n\nHow can we help you today? Feel free to ask about:\n• Profile & Aadhaar Verification 🛡️\n• Subscription Plans & Premium Features 💎\n• Safety, Reporting & Privacy 🚨\n• Matching Tips & Profile Visibility ✨\n• Billing & Payment Inquiries 💳\n\nOr simply type your question or send a screenshot!";
        }

        // Case 3: Aadhaar / Profile Verification / Blue Shield Badge
        if ($this->matchesVerification($lower)) {
            return "Hi {$firstName}! 🛡️ Here is how to complete Aadhaar profile verification:\n\n1. Go to your Profile tab and tap 'Verify Profile' (or Settings > Aadhaar Verification).\n2. Enter your 12-digit Aadhaar number to receive a secure OTP.\n3. Enter the OTP to complete instant verification.\n\nOnce verified, you'll earn the exclusive Blue Shield badge, and your profile will get 3x higher visibility and trust with potential matches!";
        }

        // Case 4: Billing / Payments / Refund / Razorpay
        if ($this->matchesBilling($lower)) {
            return "Hi {$firstName}! 💳 For billing and payment support:\n\n• If your payment was deducted but your subscription has not reflected yet, it usually reconciles automatically within 10 to 15 minutes.\n• If it still doesn't appear, please share your Razorpay Payment ID or upload a screenshot of your bank transaction receipt in this chat.\n\nOur finance team will verify and activate your plan immediately!";
        }

        // Case 5: Subscription Plans / Premium / Plus / Benefits
        if ($this->matchesPlans($lower)) {
            return "Hi {$firstName}! 💎 Here are the benefits of Heart Link subscription plans:\n\n• Heart Link Plus: Unlimited likes & swipes, rewind accidental passes, and 5 SuperLikes per week.\n• Heart Link Premium: Everything in Plus + see who liked your profile, priority match boost, and unlimited messaging with all matches!\n\nTo view active discounts and activate your plan, head over to Profile > Settings > Subscription Plans.";
        }

        // Case 6: Safety / Report User / Block / Fake Accounts
        if ($this->matchesSafety($lower)) {
            return "Hi {$firstName}! 🚨 Your safety and security are our highest priority.\n\nIf you encountered inappropriate behavior or a suspicious profile:\n1. Open their chat or profile screen.\n2. Tap the three dots (⋯) at the top right.\n3. Select 'Report User' or 'Block User'.\n\nOur 24/7 moderation team reviews flagged accounts promptly and enforces permanent bans on violators. If you have screenshots, feel free to send them here.";
        }

        // Case 7: Matching Tips / Profile Visibility / Likes
        if ($this->matchesMatching($lower)) {
            return "Hi {$firstName}! ✨ Looking to get more matches? Here are our top tips:\n\n1. Add 3 to 5 clear, high-quality photos (at least one smiling portrait!).\n2. Complete your Bio, Vibe, and Lifestyle tags so people can connect over shared interests.\n3. Complete Aadhaar verification for the Blue Shield badge (verified profiles get 3x more matches!).\n4. Send engaging opening messages based on their profile prompts!";
        }

        // Case 8: Account Deletion / Deactivation / Settings
        if ($this->matchesAccount($lower)) {
            return "Hi {$firstName}, you can manage your account anytime:\n\n• To take a temporary break: Go to Settings > Privacy & Account to hide your profile from Discover.\n• To delete permanently: Tap 'Delete Account' at the bottom of the Settings screen.\n\nIf there is any issue or feedback you'd like to share before making a decision, please let us know — we're here to help!";
        }

        // Case 9: Thank You / Gratitude
        if ($this->matchesGratitude($lower)) {
            return "You're very welcome, {$firstName}! ❤️ We're always here to support your journey on Heart Link. Let us know if there's anything else you need. Happy connecting!";
        }

        // Case 10: General fallback / acknowledging custom query
        $snippet = mb_strlen($cleanText) > 60 ? mb_substr($cleanText, 0, 57) . '...' : $cleanText;
        return "Hello {$firstName}! 👋 Thank you for messaging Heart Link Support.\n\nWe have received your query: \"{$snippet}\". Our dedicated support team is reviewing your message and will get back to you shortly.\n\nIf you have any supporting screenshots or documents, feel free to attach them in this chat!";
    }

    private function matchesGreeting(string $text): bool
    {
        $greetings = ['hi', 'hello', 'hey', 'heyy', 'heya', 'good morning', 'good afternoon', 'good evening', 'namaste', 'hola', 'sup', 'yo', 'anyone there', 'help'];
        foreach ($greetings as $g) {
            if ($text === $g || preg_match('/\b' . preg_quote($g, '/') . '\b/i', $text)) {
                return true;
            }
        }
        return false;
    }

    private function matchesVerification(string $text): bool
    {
        $keywords = ['verify', 'verification', 'aadhaar', 'aadhar', 'badge', 'blue tick', 'blue shield', 'shield', 'kyc', 'otp'];
        foreach ($keywords as $k) {
            if (str_contains($text, $k)) {
                return true;
            }
        }
        return false;
    }

    private function matchesPlans(string $text): bool
    {
        $keywords = ['plan', 'plans', 'premium', 'plus', 'subscription', 'upgrade', 'pricing', 'price', 'cost', 'membership', 'benefits'];
        foreach ($keywords as $k) {
            if (str_contains($text, $k)) {
                return true;
            }
        }
        return false;
    }

    private function matchesBilling(string $text): bool
    {
        $keywords = ['billing', 'payment', 'paid', 'refund', 'deducted', 'money', 'receipt', 'transaction', 'charged', 'failed', 'razorpay'];
        foreach ($keywords as $k) {
            if (str_contains($text, $k)) {
                return true;
            }
        }
        return false;
    }

    private function matchesSafety(string $text): bool
    {
        $keywords = ['safety', 'report', 'fake', 'scam', 'fraud', 'block', 'harass', 'abuse', 'spam', 'inappropriate', 'threat'];
        foreach ($keywords as $k) {
            if (str_contains($text, $k)) {
                return true;
            }
        }
        return false;
    }

    private function matchesMatching(string $text): bool
    {
        $keywords = ['match', 'matches', 'no matches', 'more matches', 'swipe', 'likes', 'boost', 'visibility', 'algorithm', 'tips'];
        foreach ($keywords as $k) {
            if (str_contains($text, $k)) {
                return true;
            }
        }
        return false;
    }

    private function matchesAccount(string $text): bool
    {
        $keywords = ['delete account', 'delete my account', 'delete profile', 'deactivate', 'logout', 'close account'];
        foreach ($keywords as $k) {
            if (str_contains($text, $k)) {
                return true;
            }
        }
        return false;
    }

    private function matchesGratitude(string $text): bool
    {
        $keywords = ['thank', 'thanks', 'thank you', 'thx', 'appreciate', 'great', 'awesome'];
        foreach ($keywords as $k) {
            if (str_contains($text, $k)) {
                return true;
            }
        }
        return false;
    }
}
