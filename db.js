const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Try connecting to local/remote MongoDB first
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/college_events';
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
        console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
    } catch (error) {
        console.log('⚠️  Local MongoDB not available. Starting in-memory database...');
        try {
            const { MongoMemoryServer } = require('mongodb-memory-server');
            const mongod = await MongoMemoryServer.create();
            const memUri = mongod.getUri();
            await mongoose.connect(memUri);
            console.log(`✅ In-memory MongoDB started at ${memUri}`);
            console.log('⚠️  NOTE: Data will be cleared when the server stops.');
        } catch (memError) {
            console.error('❌ Failed to start in-memory MongoDB:', memError.message);
            process.exit(1);
        }
    }
};

module.exports = connectDB;
