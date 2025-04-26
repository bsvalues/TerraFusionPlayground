import * as semver from 'semver';
import * as jwt from 'jsonwebtoken';
import { PluginManifest } from './plugin-manifest';

/**
 * Plugin Verification Result
 */
export interface VerificationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Verifies that a plugin is compatible with the current API version
 * 
 * @param manifest The plugin manifest
 * @param currentApiVersion The current API version
 * @returns Verification result
 */
export function verifyApiCompatibility(
  manifest: PluginManifest,
  currentApiVersion: string
): VerificationResult {
  const result: VerificationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Verify min API version
  if (!semver.valid(manifest.minApiVersion)) {
    result.errors.push(`Invalid minApiVersion format: ${manifest.minApiVersion}`);
    result.isValid = false;
  } else if (semver.gt(manifest.minApiVersion, currentApiVersion)) {
    result.errors.push(
      `Plugin requires minimum API version ${manifest.minApiVersion}, but current version is ${currentApiVersion}`
    );
    result.isValid = false;
  }

  // Verify max API version if specified
  if (manifest.maxApiVersion) {
    if (!semver.valid(manifest.maxApiVersion)) {
      result.errors.push(`Invalid maxApiVersion format: ${manifest.maxApiVersion}`);
      result.isValid = false;
    } else if (semver.lt(manifest.maxApiVersion, currentApiVersion)) {
      result.warnings.push(
        `Plugin supports maximum API version ${manifest.maxApiVersion}, but current version is ${currentApiVersion}. Some features may not work correctly.`
      );
    }
  }

  return result;
}

/**
 * Verifies plugin dependencies
 * 
 * @param manifest The plugin manifest
 * @param loadedPlugins Map of loaded plugins by ID
 * @returns Verification result
 */
export function verifyDependencies(
  manifest: PluginManifest,
  loadedPlugins: Map<string, PluginManifest>
): VerificationResult {
  const result: VerificationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  for (const dependency of manifest.dependencies) {
    const loadedPlugin = loadedPlugins.get(dependency.id);

    if (!loadedPlugin) {
      if (dependency.optional) {
        result.warnings.push(`Optional dependency ${dependency.id} (${dependency.version}) is not loaded`);
      } else {
        result.errors.push(`Required dependency ${dependency.id} (${dependency.version}) is not loaded`);
        result.isValid = false;
      }
      continue;
    }

    if (!semver.satisfies(loadedPlugin.version, dependency.version)) {
      result.errors.push(
        `Dependency ${dependency.id} version mismatch: required ${dependency.version}, found ${loadedPlugin.version}`
      );
      result.isValid = false;
    }
  }

  return result;
}

/**
 * Verifies a plugin's signature
 * 
 * @param manifest The plugin manifest
 * @param publicKey Public key for signature verification
 * @returns Verification result
 */
export function verifySignature(
  manifest: PluginManifest,
  publicKey: string
): VerificationResult {
  const result: VerificationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Skip verification if no signature is present
  if (!manifest.signature) {
    result.warnings.push('Plugin is not signed');
    return result;
  }

  try {
    // Create a manifest clone without the signature
    const manifestWithoutSignature = { ...manifest };
    delete manifestWithoutSignature.signature;

    // Verify the signature
    const payload = jwt.verify(manifest.signature, publicKey);
    
    // Check if the hash in the signature matches the manifest
    if (typeof payload === 'object' && payload !== null && payload.hash) {
      // In a real implementation, we would calculate a hash of the manifest
      // and compare it with the hash in the payload
      const calculatedHash = 'mock-hash';
      if (payload.hash !== calculatedHash) {
        result.errors.push('Signature hash mismatch');
        result.isValid = false;
      }
    } else {
      result.errors.push('Invalid signature payload');
      result.isValid = false;
    }
  } catch (error) {
    result.errors.push(`Signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.isValid = false;
  }

  return result;
}

/**
 * Verify all aspects of a plugin
 * 
 * @param manifest The plugin manifest
 * @param options Verification options
 * @returns Verification result
 */
export function verifyPlugin(
  manifest: PluginManifest,
  options: {
    currentApiVersion: string;
    loadedPlugins: Map<string, PluginManifest>;
    publicKey?: string;
  }
): VerificationResult {
  const result: VerificationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Verify API compatibility
  const apiResult = verifyApiCompatibility(manifest, options.currentApiVersion);
  result.isValid = result.isValid && apiResult.isValid;
  result.errors.push(...apiResult.errors);
  result.warnings.push(...apiResult.warnings);

  // Verify dependencies
  const depResult = verifyDependencies(manifest, options.loadedPlugins);
  result.isValid = result.isValid && depResult.isValid;
  result.errors.push(...depResult.errors);
  result.warnings.push(...depResult.warnings);

  // Verify signature if public key is provided
  if (options.publicKey) {
    const sigResult = verifySignature(manifest, options.publicKey);
    result.isValid = result.isValid && sigResult.isValid;
    result.errors.push(...sigResult.errors);
    result.warnings.push(...sigResult.warnings);
  } else {
    result.warnings.push('Signature verification skipped (no public key provided)');
  }

  return result;
}