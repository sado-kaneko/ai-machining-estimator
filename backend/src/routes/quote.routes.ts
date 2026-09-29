import { Router } from 'express';
import { quoteController } from '../controllers/quote.controller';

const router = Router();

// GET /api/quotes
router.get('/', (req, res) => quoteController.getAllQuotes(req, res));

// GET /api/quotes/:id
router.get('/:id', (req, res) => quoteController.getQuoteById(req, res));

// POST /api/quotes
router.post('/', (req, res) => quoteController.createQuote(req, res));

// PUT /api/quotes/:id
router.put('/:id', (req, res) => quoteController.updateQuote(req, res));

// DELETE /api/quotes/:id
router.delete('/:id', (req, res) => quoteController.deleteQuote(req, res));

export default router;
