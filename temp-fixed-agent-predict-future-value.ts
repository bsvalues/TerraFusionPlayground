/**
 * This file contains a fixed implementation of the predictFutureValue method
 * for the PropertyAssessmentAgent class.
 */

private async predictFutureValue(
  propertyId: string,
  yearsAhead: number = 5
): Promise<any> {
  try {
    // Log the future value prediction request
    await this.logActivity('value_prediction', `Predicting future value for property ${propertyId}`);
    
    // Get property details
    const propertyResult = await this.executeMCPTool('property.getByPropertyId', { propertyId });
    
    if (!propertyResult.success || !propertyResult.result) {
      throw new Error(`Property ${propertyId} not found`);
    }
    
    const property = propertyResult.result;
    
    // Check if LLM service is available
    if (!this.llmService) {
      throw new Error('LLM service not available for future value prediction');
    }
    
    // Get market factors
    const marketFactorsResult = await this.executeMCPTool('market.getFactors', {});
    const marketFactors = marketFactorsResult.success ? marketFactorsResult.result : [];
    
    // Format market factors for LLM prompt
    const marketFactorStrings = marketFactors.map(factor => 
      `${factor.name}: ${factor.value}, Trend: ${factor.trend}, Impact: ${factor.impact}`
    );
    
    // Add detailed market factor explanation
    const marketFactorExplanation = marketFactors.length > 0 
      ? `Based on market data, the following factors are considered in this prediction:
         ${marketFactors.map(factor => 
           `- ${factor.name} (${factor.trend}): Current value is ${factor.value} with a ${factor.impact} impact on property values.`
         ).join('\n')}` 
      : undefined;
    
    // Get historical data (through property trends)
    const trendResult = await this.analyzePropertyTrends(propertyId, '5years');
    const historicalData = trendResult && trendResult.dataPoints 
      ? trendResult.dataPoints 
      : [];
    
    // Format property data for the LLM
    const propertyData = {
      propertyId: property.propertyId,
      address: property.address,
      propertyType: property.propertyType,
      value: property.value,
      acres: property.acres,
      extraFields: property.extraFields || {}
    };
    
    // Call the LLM service
    const llmResponse = await this.llmService.predictFutureValue(
      propertyId,
      propertyData,
      historicalData,
      yearsAhead,
      marketFactorStrings,
      marketFactorExplanation
    );
    
    // Process and return the LLM response
    if (llmResponse && llmResponse.text) {
      let prediction;
      
      try {
        // Try to parse the JSON response
        if (typeof llmResponse.text === 'string') {
          prediction = JSON.parse(llmResponse.text);
        } else {
          prediction = llmResponse.text;
        }
        
        // Log successful prediction
        await this.logActivity('value_prediction_complete', `Completed future value prediction for property ${propertyId}`, {
          yearsAhead,
          finalYearValue: prediction.predictedValues && prediction.predictedValues.length > 0 
            ? prediction.predictedValues[prediction.predictedValues.length - 1].predictedValue 
            : 'Unknown'
        });
        
        // Ensure propertyId is included
        if (!prediction.propertyId) {
          prediction.propertyId = propertyId;
        }
        
        // Ensure current value is included
        if (!prediction.currentValue) {
          prediction.currentValue = property.value;
        }
        
        return prediction;
      } catch (parseError) {
        // Fall back to basic prediction if parsing fails
        console.error('Error parsing LLM prediction response:', parseError);
        throw new Error(`Failed to parse future value prediction: ${parseError.message}`);
      }
    } else {
      throw new Error('No valid response from the LLM service');
    }
  } catch (error) {
    await this.logActivity('value_prediction_error', `Error predicting future value for property ${propertyId}: ${error.message}`);
    
    // Return error object for the test to use
    return {
      success: false,
      error: error.message,
      agent: "Property Assessment Agent",
      capability: "predictFutureValue"
    };
  }
}