import { PluginManifest } from './manifest-schema';

export interface PluginPurchaseMetadata {
  pluginId: string;
  userId: string;
  purchaseDate: Date;
  expirationDate?: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeCheckoutSessionId?: string;
  status: 'active' | 'expired' | 'cancelled' | 'trial';
}

export interface PluginPaymentProvider {
  /**
   * Check if a user has access to a premium plugin
   */
  hasAccess(pluginId: string, userId: string): Promise<boolean>;
  
  /**
   * Get a checkout URL for purchasing a plugin
   */
  getCheckoutUrl(pluginId: string, userId: string, returnUrl: string): Promise<string>;
  
  /**
   * Process a webhook from the payment provider
   */
  processWebhook(event: any): Promise<void>;
  
  /**
   * Get all premium plugins a user has access to
   */
  getUserPremiumPlugins(userId: string): Promise<string[]>;
}

/**
 * Implementation of the plugin payment provider that integrates with Stripe
 * In a real application, this would interact with an actual Stripe account
 */
export class StripePluginPaymentProvider implements PluginPaymentProvider {
  private purchases: Map<string, PluginPurchaseMetadata> = new Map();
  private pluginPrices: Map<string, string> = new Map(); // pluginId -> stripePriceId
  
  /**
   * In a real app, you'd inject your DB layer and Stripe client
   */
  constructor(
    private apiKey: string,
    private webhookSecret: string
  ) {}
  
  /**
   * Check if a user has access to a premium plugin
   */
  async hasAccess(pluginId: string, userId: string): Promise<boolean> {
    const key = `${pluginId}:${userId}`;
    const purchase = this.purchases.get(key);
    
    if (!purchase) {
      return false;
    }
    
    // Check if the purchase is still active
    if (purchase.status === 'active') {
      // Check for expiration if applicable
      if (purchase.expirationDate && purchase.expirationDate < new Date()) {
        purchase.status = 'expired';
        this.purchases.set(key, purchase);
        return false;
      }
      return true;
    }
    
    return false;
  }
  
  /**
   * Get a checkout URL for purchasing a plugin
   */
  async getCheckoutUrl(pluginId: string, userId: string, returnUrl: string): Promise<string> {
    // In a real app, you'd use the Stripe API to create a checkout session
    // For this example, we'll just return a mock URL
    const mockSessionId = `cs_${Math.random().toString(36).substring(2, 10)}`;
    return `https://checkout.stripe.com/pay/${mockSessionId}?return_url=${encodeURIComponent(returnUrl)}`;
  }
  
  /**
   * Process a webhook from Stripe
   */
  async processWebhook(event: any): Promise<void> {
    // In a real app, you'd verify the webhook signature with Stripe
    // and update your database accordingly
    
    if (event.type === 'checkout.session.completed') {
      const { pluginId, userId } = event.data.object.metadata;
      const key = `${pluginId}:${userId}`;
      
      // Create a new purchase record
      const purchase: PluginPurchaseMetadata = {
        pluginId,
        userId,
        purchaseDate: new Date(),
        stripeCustomerId: event.data.object.customer,
        stripeSubscriptionId: event.data.object.subscription,
        stripeCheckoutSessionId: event.data.object.id,
        status: 'active'
      };
      
      // Store the purchase
      this.purchases.set(key, purchase);
    } else if (event.type === 'customer.subscription.deleted') {
      // Handle subscription cancellation
      const subscriptionId = event.data.object.id;
      
      // Find the purchase with this subscription ID
      for (const [key, purchase] of this.purchases.entries()) {
        if (purchase.stripeSubscriptionId === subscriptionId) {
          purchase.status = 'cancelled';
          this.purchases.set(key, purchase);
          break;
        }
      }
    }
  }
  
  /**
   * Get all premium plugins a user has access to
   */
  async getUserPremiumPlugins(userId: string): Promise<string[]> {
    const userPlugins: string[] = [];
    
    for (const [key, purchase] of this.purchases.entries()) {
      if (purchase.userId === userId && purchase.status === 'active') {
        // Check expiration
        if (purchase.expirationDate && purchase.expirationDate < new Date()) {
          purchase.status = 'expired';
          this.purchases.set(key, purchase);
          continue;
        }
        
        userPlugins.push(purchase.pluginId);
      }
    }
    
    return userPlugins;
  }
  
  /**
   * Register a plugin with a Stripe price
   */
  registerPluginPrice(pluginId: string, stripePriceId: string): void {
    this.pluginPrices.set(pluginId, stripePriceId);
  }
  
  /**
   * Get the Stripe price ID for a plugin
   */
  getPluginPriceId(pluginId: string): string | undefined {
    return this.pluginPrices.get(pluginId);
  }
}