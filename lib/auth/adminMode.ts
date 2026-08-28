export function adminAuthRequiredForEnvironment(nodeEnv: string | undefined, configuredValue: boolean, publicTestingMode = false) {
  if (publicTestingMode) return false;
  if (nodeEnv === "production") return true;
  return configuredValue;
}
