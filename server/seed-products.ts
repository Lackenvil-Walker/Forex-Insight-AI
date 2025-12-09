import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Creating ForexAI subscription products...');

  const starterProduct = await stripe.products.create({
    name: 'Starter',
    description: 'Free tier with 1 analysis per day',
    metadata: {
      tier: 'starter',
      analysesPerDay: '1',
    },
  });
  console.log('Created Starter product:', starterProduct.id);

  const proProduct = await stripe.products.create({
    name: 'Pro',
    description: 'Professional tier with 10 analyses per day',
    metadata: {
      tier: 'pro',
      analysesPerDay: '10',
    },
  });
  console.log('Created Pro product:', proProduct.id);

  const proMonthlyPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 2900,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { tier: 'pro', billing: 'monthly' },
  });
  console.log('Created Pro Monthly price:', proMonthlyPrice.id, '($29/month)');

  const proYearlyPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 29000,
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { tier: 'pro', billing: 'yearly' },
  });
  console.log('Created Pro Yearly price:', proYearlyPrice.id, '($290/year)');

  const unlimitedProduct = await stripe.products.create({
    name: 'Unlimited',
    description: 'Unlimited analyses with priority support',
    metadata: {
      tier: 'unlimited',
      analysesPerDay: 'unlimited',
    },
  });
  console.log('Created Unlimited product:', unlimitedProduct.id);

  const unlimitedMonthlyPrice = await stripe.prices.create({
    product: unlimitedProduct.id,
    unit_amount: 9900,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { tier: 'unlimited', billing: 'monthly' },
  });
  console.log('Created Unlimited Monthly price:', unlimitedMonthlyPrice.id, '($99/month)');

  const unlimitedYearlyPrice = await stripe.prices.create({
    product: unlimitedProduct.id,
    unit_amount: 99000,
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { tier: 'unlimited', billing: 'yearly' },
  });
  console.log('Created Unlimited Yearly price:', unlimitedYearlyPrice.id, '($990/year)');

  console.log('\n✅ All products and prices created successfully!');
  console.log('\nProduct IDs:');
  console.log(`  Starter: ${starterProduct.id}`);
  console.log(`  Pro: ${proProduct.id}`);
  console.log(`  Unlimited: ${unlimitedProduct.id}`);
  console.log('\nPrice IDs:');
  console.log(`  Pro Monthly: ${proMonthlyPrice.id}`);
  console.log(`  Pro Yearly: ${proYearlyPrice.id}`);
  console.log(`  Unlimited Monthly: ${unlimitedMonthlyPrice.id}`);
  console.log(`  Unlimited Yearly: ${unlimitedYearlyPrice.id}`);
}

createProducts().catch(console.error);
