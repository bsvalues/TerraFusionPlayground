/**
 * Mobile Property Form
 *
 * Form component for editing property details on mobile
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

/**
 * Property form props interface
 */
export interface MobilePropertyFormProps {
  /**
   * Property data
   */
  data: any;

  /**
   * On change callback
   */
  onChange?: (data: any) => void;

  /**
   * Loading state
   */
  isLoading?: boolean;

  /**
   * Sync status indicator
   */
  syncStatus?: 'synced' | 'syncing' | 'unsynced' | 'conflict' | 'failed';
}

/**
 * Mobile property form component
 */
export const MobilePropertyForm: React.FC<MobilePropertyFormProps> = ({
  data,
  onChange,
  isLoading = false,
  syncStatus = 'unsynced',
}) => {
  // Local form state
  const [formValues, setFormValues] = useState<any>({});

  // Update form values when data changes
  useEffect(() => {
    setFormValues(data || {});
  }, [data]);

  // Handle field changes
  const handleChange = (field: string, value: any) => {
    setFormValues(prev => {
      const newValues = { ...prev, [field]: value };

      // Call the onChange callback if provided
      if (onChange) {
        onChange(newValues);
      }

      return newValues;
    });
  };

  // Handle features input as comma-separated string
  const handleFeaturesChange = (value: string) => {
    const features = value
      .split(',')
      .map(feature => feature.trim())
      .filter(Boolean);

    handleChange('features', features);
  };

  // Get features string from array
  const getFeaturesString = () => {
    if (!formValues.features || !Array.isArray(formValues.features)) {
      return '';
    }
    return formValues.features.join(', ');
  };

  // Get sync status indicator color
  const getSyncStatusColor = () => {
    switch (syncStatus) {
      case 'synced':
        return '#4CAF50'; // Green
      case 'syncing':
        return '#2196F3'; // Blue
      case 'unsynced':
        return '#9E9E9E'; // Gray
      case 'conflict':
        return '#FF9800'; // Orange
      case 'failed':
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Gray
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Property Details</Text>
          <View style={[styles.syncIndicator, { backgroundColor: getSyncStatusColor() }]}>
            <Text style={styles.syncText}>{syncStatus}</Text>
          </View>
        </View>

        {/* Property ID - Read-only */}
        <View style={styles.formField}>
          <Text style={styles.label}>Property ID</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={formValues.id || ''}
            editable={false}
          />
        </View>

        {/* Address */}
        <View style={styles.formField}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            value={formValues.address || ''}
            onChangeText={value => handleChange('address', value)}
            placeholder="Enter property address"
            editable={!isLoading}
          />
        </View>

        {/* Owner */}
        <View style={styles.formField}>
          <Text style={styles.label}>Owner</Text>
          <TextInput
            style={styles.input}
            value={formValues.owner || ''}
            onChangeText={value => handleChange('owner', value)}
            placeholder="Enter property owner"
            editable={!isLoading}
          />
        </View>

        {/* Value */}
        <View style={styles.formField}>
          <Text style={styles.label}>Value</Text>
          <TextInput
            style={styles.input}
            value={formValues.value ? String(formValues.value) : ''}
            onChangeText={value => handleChange('value', value ? Number(value) : null)}
            placeholder="Enter property value"
            keyboardType="numeric"
            editable={!isLoading}
          />
        </View>

        {/* Last Inspection */}
        <View style={styles.formField}>
          <Text style={styles.label}>Last Inspection</Text>
          <TextInput
            style={styles.input}
            value={formValues.lastInspection || ''}
            onChangeText={value => handleChange('lastInspection', value)}
            placeholder="YYYY-MM-DD"
            editable={!isLoading}
          />
        </View>

        {/* Features */}
        <View style={styles.formField}>
          <Text style={styles.label}>Features</Text>
          <TextInput
            style={styles.input}
            value={getFeaturesString()}
            onChangeText={handleFeaturesChange}
            placeholder="Enter features, separated by commas"
            editable={!isLoading}
          />
          <Text style={styles.helperText}>
            Enter features separated by commas (e.g. "3 bedrooms, 2 baths, garage")
          </Text>
        </View>

        {/* Notes */}
        <View style={styles.formField}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={formValues.notes || ''}
            onChangeText={value => handleChange('notes', value)}
            placeholder="Enter property notes"
            multiline
            numberOfLines={4}
            editable={!isLoading}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.button, isLoading ? styles.disabledButton : null]}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Save Property</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  syncIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  syncText: {
    fontSize: 12,
    color: 'white',
    textTransform: 'capitalize',
  },
  formField: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#757575',
  },
  helperText: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#4361ee',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#a0a0a0',
  },
});
