const app = new Vue({
    el: '#script',
    data: {
      url: '',
      slug: '',
      error: '',
      formVisible: true,
      created: null,
    },
    methods: {
      async createUrl() {
        this.error = '';
        const response = await fetch('/url', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            url: this.url,
            slug: this.slug || undefined,
          }),
        });
        if (response.ok) {
          const result = await response.json();
          this.formVisible = false;
          this.created = `https://urlshort/${result.slug}`;
        } else if (response.status === 429) {
          this.error = '429 Too Many Requests. try again after 30 seconds';
        } else {
          const result = await response.json();
          this.error = result.message;
        }
      },
    },
  });
