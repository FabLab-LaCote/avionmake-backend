FROM bfritscher/nodejs-grunt-bower
RUN mkdir -p /avionmake
COPY . /avionmake/
WORKDIR /avionmake
RUN npm install
RUN grunt

VOLUME ["/avionmake/dist/pdf"]

# Define default command.
CMD ["supervisor", "--watch", "/avionmake/dist"]
