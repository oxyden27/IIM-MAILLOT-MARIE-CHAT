## Setup

Install /node_modules/

```bash
$ yarn install
```

Launch nodejs

```bash
$ yarn start
```

## Events

### Server

**chat.join**

```js
{
    "username": "John Doe"
}
```

**chat.message**
```js
{
    "username": "John Doe",
    "message": "Lorem Ipsum..."
}

### Client

**chat.join**

```js
{
    "username": "John Doe"
}
```

**chat.message**
```js
{
    "message": "Lorem Ipsum..."
}
```