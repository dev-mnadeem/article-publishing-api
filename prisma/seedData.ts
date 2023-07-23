export interface SeedPost {
  title: string;
  content: string;
}

export const SEED_USER = {
  name: 'John Doe',
  email: 'johndoe@example.com',
  password: 'abcd1234',
};

export const SEED_POSTS: SeedPost[] = [
  {
    title: 'Learn Nodejs',
    content: 'In this blog, we are going to teach you how to learn Nodejs.',
  },
  {
    title: 'Introduction to JavaScript',
    content: 'This blog introduces you to the fundamentals of JavaScript programming.',
  },
  {
    title: 'Mastering React',
    content: "In this blog series, we'll cover everything you need to know to become a React expert.",
  },
  {
    title: 'Getting Started with Express',
    content: 'Learn how to set up and use Express.js, the popular Node.js web framework.',
  },
  {
    title: 'CSS Flexbox Tutorial',
    content: 'This tutorial will teach you all about CSS Flexbox and how to create responsive layouts.',
  },
  {
    title: 'Database Design Best Practices',
    content: 'Learn the best practices for designing efficient and scalable databases.',
  },
  {
    title: 'Python Crash Course',
    content: 'A crash course in Python programming for beginners and newcomers.',
  },
  {
    title: 'Understanding RESTful APIs',
    content: "In this blog series, we'll explain the concepts and principles of RESTful APIs.",
  },
  {
    title: 'JavaScript Design Patterns',
    content: 'Explore various design patterns in JavaScript to write maintainable code.',
  },
];
