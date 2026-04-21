export type SendEmailJob = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};
