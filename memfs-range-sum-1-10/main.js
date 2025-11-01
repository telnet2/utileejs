// main.js: Range Summation Utility

function main() {
  const args = process.argv.slice(2);
  const rangeFlagIndex = args.indexOf('--range');
  if (rangeFlagIndex === -1 || rangeFlagIndex === args.length - 1) {
    console.error('Error: --range flag is required with a value.');
    return;
  }

  const rangeValue = args[rangeFlagIndex + 1];
  const parts = rangeValue.split(',');
  if (parts.length !== 2) {
    console.error('Error: --range value must be in format M,N');
    return;
  }

  const M = Number(parts[0]);
  const N = Number(parts[1]);

  if (!Number.isInteger(M) || !Number.isInteger(N)) {
    console.error('Error: M and N must be integers.');
    return;
  }

  if (M > N) {
    console.error('Error: M must be less than or equal to N.');
    return;
  }

  let sum = 0;
  for (let i = M; i <= N; i++) {
    sum += i;
  }

  console.log(`Sum from ${M} to ${N} is ${sum}`);
}

main();