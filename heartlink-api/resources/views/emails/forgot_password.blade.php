<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - HeartLink</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background-color: #0d0614;
            color: #ffffff;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 550px;
            margin: 40px auto;
            background: linear-gradient(145deg, #180c26 0%, #10061c 100%);
            border-radius: 20px;
            border: 1px solid rgba(255, 0, 127, 0.3);
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }
        .header {
            padding: 35px 30px 15px 30px;
            text-align: center;
        }
        .logo-title {
            color: #ffffff;
            font-size: 28px;
            font-weight: 900;
            margin: 10px 0 0 0;
            letter-spacing: -0.5px;
        }
        .logo-title span {
            color: #FF007F;
        }
        .content {
            padding: 20px 35px 35px 35px;
            text-align: center;
        }
        .content p {
            color: #b0a5c0;
            font-size: 15px;
            line-height: 1.6;
            margin-bottom: 25px;
        }
        .btn-wrapper {
            margin: 25px 0;
        }
        .btn {
            background: linear-gradient(90deg, #FF007F 0%, #B5179E 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 15px 32px;
            border-radius: 14px;
            font-weight: 700;
            font-size: 16px;
            display: inline-block;
            box-shadow: 0 8px 25px rgba(255, 0, 127, 0.4);
        }
        .footer {
            background-color: rgba(0, 0, 0, 0.3);
            padding: 18px 30px;
            text-align: center;
            font-size: 12px;
            color: #6b5c82;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .code-box {
            background: rgba(255, 0, 127, 0.08);
            border: 1px dashed rgba(255, 0, 127, 0.5);
            border-radius: 10px;
            padding: 12px;
            font-size: 12px;
            color: #ff99cc;
            margin-top: 20px;
            word-break: break-all;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="font-size: 44px;">💖</div>
            <h1 class="logo-title">Heart<span>Link</span></h1>
        </div>
        <div class="content">
            <h2 style="font-size: 20px; color: #ffffff; margin-bottom: 12px;">Reset Your Password</h2>
            <p>We received a request to reset the password for your HeartLink account. Click the button below to proceed:</p>

            <div class="btn-wrapper">
                <a href="{{ $resetUrl }}" class="btn">Reset Password</a>
            </div>

            <p style="font-size: 13px; color: #8a7a9e; margin-bottom: 10px;">If you didn't request this, you can safely ignore this email. Your password will remain unchanged.</p>

            <div class="code-box">
                Or copy and paste this link into your browser:<br>
                <a href="{{ $resetUrl }}" style="color: #FF007F; text-decoration: underline;">{{ $resetUrl }}</a>
            </div>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} HeartLink. All rights reserved.
        </div>
    </div>
</body>
</html>
