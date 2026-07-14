const axios = require('axios');

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN; // ex: moncampdebase.myshopify.com
const SHOPIFY_STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;
if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_TOKEN) {
    console.error('[SHOPIFY] SHOPIFY_STORE_DOMAIN ou SHOPIFY_STOREFRONT_TOKEN manquant dans les variables d\'environnement');
}

const API_VERSION = '2024-10';
const ENDPOINT = SHOPIFY_STORE_DOMAIN ? `https://${SHOPIFY_STORE_DOMAIN}/api/${API_VERSION}/graphql.json` : null;
const BOUTIQUE_URL_FALLBACK = 'https://moncampdebase.com';

// Cache en memoire: le catalogue ne change pas d'une generation de script a l'autre,
// pas la peine de re-interroger Shopify a chaque appel.
let cacheProduits = null;
let cacheExpiration = 0;
const CACHE_DUREE_MS = 30 * 60 * 1000; // 30 minutes

async function getProduits(limite = 50) {
    if (cacheProduits && Date.now() < cacheExpiration) return cacheProduits;

    if (!ENDPOINT || !SHOPIFY_STOREFRONT_TOKEN) {
        console.error('[SHOPIFY] Configuration manquante, impossible de recuperer le catalogue');
        return cacheProduits || [];
    }

    const query = `
        query ProduitsDisponibles($limite: Int!) {
            products(first: $limite, sortKey: BEST_SELLING) {
                edges {
                    node {
                        title
                        description
                        onlineStoreUrl
                        productType
                        availableForSale
                        priceRange { minVariantPrice { amount currencyCode } }
                    }
                }
            }
        }
    `;

    try {
        const response = await axios.post(
            ENDPOINT,
            { query, variables: { limite } },
            {
                headers: {
                    'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );

        if (response.data.errors) {
            console.error('[SHOPIFY] Erreur GraphQL:', JSON.stringify(response.data.errors));
            return cacheProduits || [];
        }

        const produits = (response.data.data?.products?.edges || [])
            .map(({ node }) => ({
                titre: node.title,
                description: (node.description || '').replace(/\s+/g, ' ').trim().substring(0, 400),
                url: node.onlineStoreUrl || BOUTIQUE_URL_FALLBACK,
                categorie: node.productType || '',
                prix: node.priceRange?.minVariantPrice?.amount || null,
                devise: node.priceRange?.minVariantPrice?.currencyCode || 'EUR',
                disponible: node.availableForSale
            }))
            .filter((p) => p.disponible);

        cacheProduits = produits;
        cacheExpiration = Date.now() + CACHE_DUREE_MS;
        console.log(`[SHOPIFY] ${produits.length} produits recuperes du catalogue`);
        return produits;

    } catch (error) {
        console.error('[SHOPIFY] Erreur recuperation catalogue:', error.response?.data || error.message);
        return cacheProduits || [];
    }
}

async function getProduitAleatoire() {
    const produits = await getProduits();
    if (produits.length === 0) return null;
    return produits[Math.floor(Math.random() * produits.length)];
}

// Recherche approximative (sous-chaine, insensible a la casse) quand l'utilisateur tape
// un nom de produit dans le dashboard — pour retrouver la vraie fiche produit correspondante
// plutot que de laisser Claude improviser des caracteristiques.
async function trouverProduit(nomApprox) {
    if (!nomApprox) return null;
    const produits = await getProduits();
    const cible = nomApprox.toLowerCase().trim();
    return produits.find((p) => p.titre.toLowerCase().includes(cible) || cible.includes(p.titre.toLowerCase())) || null;
}

module.exports = { getProduits, getProduitAleatoire, trouverProduit };
