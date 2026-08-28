export function adminAuthRequiredForEnvironment(nodeEnv: string | undefined, configuredValue: boolean) {
  if (nodeEnv === "production") return true;
  return configuredValue;
}
