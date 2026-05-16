<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mwamini Chat - Sign In</title>
    <link rel="stylesheet" href="style.css">
</head>
<body class="auth-page">
    <div class="glass-container auth-card">
        <div class="auth-header">
            <div class="logo-badge">M</div>
            <h1>Mwamini Chat</h1>
            <p class="subtitle">PROJECT DEMO WORKSPACE</p>
        </div>
        
        <form id="loginForm" class="auth-form">
            <div id="authErrorMessage" class="error-msg" style="display: none;"></div>
            
            <div class="input-group">
                <span class="icon">✉</span>
                <input type="email" id="loginEmail" placeholder="Email Address" required>
            </div>
            <div class="input-group">
                <span class="icon">🔒</span>
                <input type="password" id="loginPassword" placeholder="Password" required>
            </div>
            
            <button type="submit" class="btn-primary" id="loginBtn">Sign In</button>
        </form>

        <div class="divider"><span>OR CONTINUE WITH</span></div>

        <button class="btn-secondary" id="googleAuthBtn">
            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google logo" class="google-icon">
            Sign In with Google
        </button>

        <p class="auth-footer">New to the platform? <a href="#">Create an account</a></p>
    </div>
    <script src="app.js"></script>
</body>
</html>
