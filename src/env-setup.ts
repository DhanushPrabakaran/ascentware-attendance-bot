import 'dotenv/config';

// Map legacy Bot Framework env vars to the new Agents SDK expected vars before any SDK modules load
if (process.env.MicrosoftAppId && !process.env.CLIENT_ID) {
    process.env.CLIENT_ID = process.env.MicrosoftAppId;
}
if (process.env.MicrosoftAppPassword && !process.env.CLIENT_SECRET) {
    process.env.CLIENT_SECRET = process.env.MicrosoftAppPassword;
}
