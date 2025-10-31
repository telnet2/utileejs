// main.js

// Parse command line arguments
const args = process.argv.slice(2);

function parseRangeArgument(args) {
  const rangeFlagIndex = args.findIndex(arg => arg === '--range');
  if (rangeFlagIndex === -1) {
    console.error('Error: Missing --range flag. Usage: --range M,N');
    return null;
  }

  const rangeArg = args[rangeFlagIndex + 1];
  if (!rangeArg) {
    console.error('Error: Missing range values after --range. Usage: --range M,N');
    return null;
  }

  const parts = rangeArg.split(',');
  if (parts.length !== 2) {
    console.error('Error: Range must be two integers separated by a comma.');
    return null;
  }

  const M = parseInt(parts[0], 10);
  const N = parseInt(parts[1], 10);

  if (isNaN(M) || isNaN(N)) {
    console.error('Error: Both range values must be valid integers.');
    return null;
  }

  if (M > N) {
    console.error('Error: M must be less than or equal to N in --range M,N');
    return null;
  }

  return { M, N };
}

function main() {
  const range = parseRangeArgument(args);
  if (!range) return;

  let sum = 0;
  for (let i = range.M; i <= range.N; i++) {
    sum += i;
  }

  console.log(`Sum from ${range.M} to ${range.N} is ${sum}`);
}

main();
