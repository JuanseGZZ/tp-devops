export const toRegisterPayload = ({ username, email, password, captchaToken }) => ({
  username,
  email,
  password,
  captchaToken,
});

export const toLoginPayload = ({ email, password }) => ({ email, password });

export const toVerifyEmailPayload = ({ email, code }) => ({ email, code });
