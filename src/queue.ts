import Bottleneck from 'bottleneck';

export const queue = new Bottleneck({
  minTime: 100,
});

export const singleQueue = new Bottleneck({
  maxConcurrent: 1,
});
