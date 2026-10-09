// Adds the iOS Google redirect scheme (the reversed iOS client ID) to the
// schemes in app.json, since it depends on the client ID in .env.
export default ({ config }: { config: { scheme?: string | string[] } }) => {
  const ios = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim().replace(
    /\.apps\.googleusercontent\.com$/,
    '',
  );
  const schemes = ([] as string[]).concat(config.scheme ?? []);
  if (ios) schemes.push(`com.googleusercontent.apps.${ios}`);
  return { ...config, scheme: schemes };
};
