/**
 * Setting Model
 * MongoDB collection: settings
 */

const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100,
    validate: {
      validator: function(v) {
        // Key should be alphanumeric with underscores/dots
        return /^[a-zA-Z0-9_.]+$/.test(v);
      },
      message: 'Key must contain only letters, numbers, underscores, and dots'
    }
  },
  
  value: {
    type: mongoose.Schema.Types.Mixed, // Can store any type: string, number, object, array
    required: true
  },
  
  // Additional fields for better setting management
  description: {
    type: String,
    maxlength: 500
  },
  
  category: {
    type: String,
    enum: ['system', 'user', 'chain', 'security', 'feature', 'ui'],
    default: 'system'
  },
  
  isPublic: {
    type: Boolean,
    default: false // Most settings should be private by default
  },
  
  dataType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    required: true
  },
  
  // For validation
  validation: {
    min: Number,
    max: Number,
    enum: [String],
    regex: String
  }
}, {
  timestamps: { 
    createdAt: true, 
    updatedAt: true 
  },
  collection: 'settings'
});

// Indexes
settingSchema.index({ key: 1 }, { unique: true });
settingSchema.index({ category: 1 });
settingSchema.index({ isPublic: 1 });
settingSchema.index({ updatedAt: -1 });

// Static methods
settingSchema.statics.get = function(key, defaultValue = null) {
  return this.findOne({ key }).then(setting => {
    return setting ? setting.value : defaultValue;
  });
};

settingSchema.statics.set = function(key, value, options = {}) {
  const { description, category, isPublic, dataType } = options;
  
  // Determine data type if not provided
  let inferredType = dataType;
  if (!inferredType) {
    if (typeof value === 'string') inferredType = 'string';
    else if (typeof value === 'number') inferredType = 'number';
    else if (typeof value === 'boolean') inferredType = 'boolean';
    else if (Array.isArray(value)) inferredType = 'array';
    else if (typeof value === 'object') inferredType = 'object';
    else inferredType = 'string';
  }
  
  return this.findOneAndUpdate(
    { key },
    {
      key,
      value,
      description,
      category,
      isPublic,
      dataType: inferredType
    },
    { 
      upsert: true, 
      new: true,
      runValidators: true
    }
  );
};

settingSchema.statics.getByCategory = function(category, publicOnly = false) {
  const query = { category };
  if (publicOnly) {
    query.isPublic = true;
  }
  
  return this.find(query).sort({ key: 1 });
};

settingSchema.statics.getPublicSettings = function() {
  return this.find({ isPublic: true }).sort({ category: 1, key: 1 });
};

settingSchema.statics.getAllSettings = function() {
  return this.find({}).sort({ category: 1, key: 1 });
};

settingSchema.statics.deleteByKey = function(key) {
  return this.findOneAndDelete({ key });
};

settingSchema.statics.bulkSet = function(settings) {
  const operations = settings.map(({ key, value, ...options }) => ({
    updateOne: {
      filter: { key },
      update: {
        key,
        value,
        ...options,
        dataType: options.dataType || typeof value
      },
      upsert: true
    }
  }));
  
  return this.bulkWrite(operations);
};

// Instance methods
settingSchema.methods.updateValue = function(newValue) {
  this.value = newValue;
  
  // Update data type if it changed
  if (typeof newValue === 'string') this.dataType = 'string';
  else if (typeof newValue === 'number') this.dataType = 'number';
  else if (typeof newValue === 'boolean') this.dataType = 'boolean';
  else if (Array.isArray(newValue)) this.dataType = 'array';
  else if (typeof newValue === 'object') this.dataType = 'object';
  
  return this.save();
};

// Pre-save validation
settingSchema.pre('save', function(next) {
  // Validate value based on validation rules
  if (this.validation) {
    const { min, max, enum: enumValues, regex } = this.validation;
    
    if (typeof this.value === 'number') {
      if (min !== undefined && this.value < min) {
        return next(new Error(`Value must be at least ${min}`));
      }
      if (max !== undefined && this.value > max) {
        return next(new Error(`Value must be at most ${max}`));
      }
    }
    
    if (enumValues && !enumValues.includes(this.value)) {
      return next(new Error(`Value must be one of: ${enumValues.join(', ')}`));
    }
    
    if (regex && typeof this.value === 'string') {
      const regexPattern = new RegExp(regex);
      if (!regexPattern.test(this.value)) {
        return next(new Error(`Value does not match required pattern`));
      }
    }
  }
  
  next();
});

// Default settings to initialize
settingSchema.statics.initializeDefaults = async function() {
  const defaultSettings = [
    {
      key: 'app.name',
      value: 'EVM Multichain Wallet',
      description: 'Application name',
      category: 'system',
      isPublic: true,
      dataType: 'string'
    },
    {
      key: 'app.version',
      value: '1.0.0',
      description: 'Application version',
      category: 'system',
      isPublic: true,
      dataType: 'string'
    },
    {
      key: 'features.orders_enabled',
      value: true,
      description: 'Enable limit orders feature',
      category: 'feature',
      isPublic: true,
      dataType: 'boolean'
    },
    {
      key: 'features.ipfs_enabled',
      value: true,
      description: 'Enable IPFS receipts',
      category: 'feature',
      isPublic: true,
      dataType: 'boolean'
    },
    {
      key: 'security.max_order_duration',
      value: 2592000, // 30 days in seconds
      description: 'Maximum order duration in seconds',
      category: 'security',
      isPublic: false,
      dataType: 'number'
    },
    {
      key: 'ui.default_theme',
      value: 'light',
      description: 'Default UI theme',
      category: 'ui',
      isPublic: true,
      dataType: 'string',
      validation: { enum: ['light', 'dark'] }
    }
  ];
  
  for (const setting of defaultSettings) {
    await this.set(setting.key, setting.value, {
      description: setting.description,
      category: setting.category,
      isPublic: setting.isPublic,
      dataType: setting.dataType,
      validation: setting.validation
    });
  }
};

const Setting = mongoose.model('Setting', settingSchema);

module.exports = Setting;
