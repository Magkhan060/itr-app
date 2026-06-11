import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    pan: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    // Aadhaar stored encrypted
    aadhaarEncrypted: {
      type: String,
      default: null,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    // Senior citizen flags derived from DOB at computation time
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Never expose sensitive fields in JSON responses
userSchema.methods.toSafeObject = function () {
  return {
    id:        this._id,
    pan:       this.pan,
    fullName:  this.fullName,
    email:     this.email,
    mobile:    this.mobile,
    dateOfBirth: this.dateOfBirth,
    createdAt: this.createdAt,
  };
};

export default mongoose.model("User", userSchema);
