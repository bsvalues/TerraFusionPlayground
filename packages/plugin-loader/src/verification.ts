import * as semver from 'semver';
import * as jwt from 'jsonwebtoken';
import { PluginManifest } from './manifest-schema';

export interface VerificationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Verifies a plugin manifest against core platform version requirements
 * and validates the signature if a public key is provided
 * 
 * @param manifest The plugin manifest to verify
 * @param coreVersion The current core platform version to check compatibility with
 * @param publicKey Optional public key to verify the signature
 * @returns Verification result with validity status and any errors/warnings
 */
export function verifyPluginManifest(
  manifest: PluginManifest,
  coreVersion: string,
  publicKey?: string
): VerificationResult {
  const result: VerificationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Verify the peer version compatibility
  if (!isPeerVersionCompatible(manifest.peerVersion, coreVersion)) {
    result.isValid = false;
    result.errors.push(
      `Plugin requires core version ${manifest.peerVersion}, but current version is ${coreVersion}`
    );
  }

  // Verify signature if provided
  if (manifest.signature && (publicKey || manifest.publicKey)) {
    const keyToUse = publicKey || manifest.publicKey;
    const { manifestDataForVerification, signature } = extractSignatureData(manifest);
    
    try {
      const isValid = verifySignature(manifestDataForVerification, signature, keyToUse);
      if (!isValid) {
        result.isValid = false;
        result.errors.push('Plugin signature verification failed');
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Signature verification error: ${error.message}`);
    }
  } else if (manifest.signature && !manifest.publicKey && !publicKey) {
    result.warnings.push('Plugin has a signature but no public key was provided for verification');
  } else if (!manifest.signature) {
    result.warnings.push('Plugin is unsigned. Consider using signed plugins for better security');
  }
  
  // Add other verifications as needed:
  // - Check for required capabilities
  // - Validate plugin structure
  // - Check for restricted API usage
  
  return result;
}

/**
 * Checks if the plugin's peer version requirement is compatible with the current core version
 * 
 * @param peerVersion The peer version requirement from the plugin manifest
 * @param coreVersion The current core platform version
 * @returns Whether the versions are compatible
 */
function isPeerVersionCompatible(peerVersion: string, coreVersion: string): boolean {
  return semver.satisfies(coreVersion, peerVersion);
}

/**
 * Extract data required for signature verification from a manifest
 */
function extractSignatureData(manifest: PluginManifest): { manifestDataForVerification: string, signature: string } {
  // Create a copy of the manifest without the signature to verify
  const { signature, ...manifestWithoutSignature } = manifest;
  
  return {
    manifestDataForVerification: JSON.stringify(manifestWithoutSignature),
    signature
  };
}

/**
 * Verify the signature of a plugin manifest
 */
function verifySignature(data: string, signature: string, publicKey: string): boolean {
  try {
    // Use JWT for verification as a simple approach
    // In a production system, you might want to use a more robust verification mechanism
    const decoded = jwt.verify(signature, publicKey, {
      algorithms: ['RS256']
    });
    
    // Check that the hash matches our data
    const expectedHash = createHash(data);
    return decoded['hash'] === expectedHash;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Create a simple hash of the data for verification
 * In a real implementation you would use a cryptographic hash function
 */
function createHash(data: string): string {
  // This is a placeholder - in production use a proper crypto library
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}