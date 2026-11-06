const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    schemeId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid'],
      default: 'draft',
      index: true,
    },
    appliedAt: { type: Date },
    referenceNumber: { type: String },
    paymentStatus: { type: String, enum: ['pending', 'credited', 'failed'], default: 'pending' },
    paymentDate: { type: Date },
    documentsChecklist: [{
      name: String,
      isReady: { type: Boolean, default: false },
    }],
    notes: String,
  },
  { timestamps: true }
);

applicationSchema.index({ userId: 1, schemeId: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);