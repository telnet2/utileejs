// Parse and validate the --range argument
const args = process.argv.slice(2);

// Find --range argument
const rangeArgIndex = args.indexOf('--range');
if (rangeArgIndex === -1 || rangeArgIndex === args.length - 1) {
  console.error('Error: Missing or invalid --range argument. Expected format --range M,N');
  return;
}

const rangeValue = args[rangeArgIndex + 1];
const parts = rangeValue.split(',');

if (parts.length !== 2) {
  console.error('Error: Range must be in the format M,N');
  return;
}

const M = Number(parts[0]);
const N = Number(parts[1]);

if (!Number.isInteger(M) || !Number.isInteger(N)) {
  console.error('Error: Both M and N must be integers');
  return;
}

if (M > N) {
  console.error('Error: M must be less than or equal to N');
  return;
}

// Calculate sum using a for loop
let sum = 0;
for (let i = M; i <= N; i++) {
  sum += i;
}

console.log(`Sum from ${M} to ${N} is ${sum}`);