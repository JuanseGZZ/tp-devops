// Input shapes for auth endpoints — validate/sanitize before reaching service layer

class RegisterDTO {
  constructor({ username, email, password, captchaToken }) {
    this.username = username;
    this.email = email;
    this.password = password;
    this.captchaToken = captchaToken;
  }
}

class VerifyEmailDTO {
  constructor({ email, code }) {
    this.email = email;
    this.code = code;
  }
}

class LoginDTO {
  constructor({ email, password }) {
    this.email = email;
    this.password = password;
  }
}

module.exports = { RegisterDTO, VerifyEmailDTO, LoginDTO };
