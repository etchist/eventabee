import * as express from 'express';
import { logger } from '@eventabee/shared-utils';
import { createEvent } from '@eventabee/event-core';
import { EventProcessor } from '../services/event-processor';

export const webhookRoutes = express.Router();

const eventProcessor = new EventProcessor();

webhookRoutes.post('/orders/create', async (req, res) => {
  try {
    const order = req.body;
    const shop = req.get('X-Shopify-Shop-Domain') || '';
    
    logger.info('Order created webhook received', { 
      orderId: order.id, 
      shop,
      correlationId: req.get('X-Shopify-Request-Id') 
    });

    const event = createEvent('order_placed', shop)
      .setUserId(order.customer?.id?.toString())
      .setOrderId(order.id.toString())
      .setProperties({
        order_number: order.number,
        total_price: order.total_price,
        currency: order.currency,
        email: order.email,
        line_items: order.line_items?.map((item: any) => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          price: item.price,
          title: item.title,
        })),
        customer: {
          id: order.customer?.id,
          email: order.customer?.email,
          first_name: order.customer?.first_name,
          last_name: order.customer?.last_name,
        },
      })
      .build();

    await eventProcessor.processEvent(event);
    
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error processing order created webhook', { error });
    res.status(500).send('Error processing webhook');
  }
});

webhookRoutes.post('/orders/updated', async (req, res) => {
  try {
    const order = req.body;
    const shop = req.get('X-Shopify-Shop-Domain') || '';
    
    logger.info('Order updated webhook received', { 
      orderId: order.id, 
      shop,
      correlationId: req.get('X-Shopify-Request-Id') 
    });

    const event = createEvent('order_updated', shop)
      .setUserId(order.customer?.id?.toString())
      .setOrderId(order.id.toString())
      .setProperties({
        order_number: order.number,
        total_price: order.total_price,
        financial_status: order.financial_status,
        fulfillment_status: order.fulfillment_status,
      })
      .build();

    await eventProcessor.processEvent(event);
    
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error processing order updated webhook', { error });
    res.status(500).send('Error processing webhook');
  }
});

webhookRoutes.post('/customers/create', async (req, res) => {
  try {
    const customer = req.body;
    const shop = req.get('X-Shopify-Shop-Domain') || '';
    
    logger.info('Customer created webhook received', { 
      customerId: customer.id, 
      shop,
      correlationId: req.get('X-Shopify-Request-Id') 
    });

    const event = createEvent('customer_created', shop)
      .setUserId(customer.id.toString())
      .setCustomerId(customer.id.toString())
      .setProperties({
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        accepts_marketing: customer.accepts_marketing,
        created_at: customer.created_at,
      })
      .build();

    await eventProcessor.processEvent(event);
    
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error processing customer created webhook', { error });
    res.status(500).send('Error processing webhook');
  }
});

webhookRoutes.post('/products/create', async (req, res) => {
  try {
    const product = req.body;
    const shop = req.get('X-Shopify-Shop-Domain') || '';
    
    logger.info('Product created webhook received', { 
      productId: product.id, 
      shop,
      correlationId: req.get('X-Shopify-Request-Id') 
    });

    const event = createEvent('product_created', shop)
      .setProductId(product.id.toString())
      .setProperties({
        title: product.title,
        vendor: product.vendor,
        product_type: product.product_type,
        handle: product.handle,
        status: product.status,
        variants: product.variants?.map((variant: any) => ({
          id: variant.id,
          title: variant.title,
          price: variant.price,
          sku: variant.sku,
        })),
      })
      .build();

    await eventProcessor.processEvent(event);
    
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error processing product created webhook', { error });
    res.status(500).send('Error processing webhook');
  }
});