import superjson from 'superjson';

// Simulate what tRPC does with the input from the URL
const rawInput = '{"json":{"page":1,"pageSize":5,"startTime":"2026-06-02 00:00:00","endTime":"2026-06-09 23:59:59","timeType":"orderCreateTime"}}';
const parsed = JSON.parse(rawInput);
console.log('Parsed:', parsed);
const deserialized = superjson.deserialize(parsed);
console.log('Deserialized:', deserialized);
