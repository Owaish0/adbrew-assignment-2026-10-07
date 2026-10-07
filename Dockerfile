# set base image (host OS)
# Bullseye still provides libssl1.1, required by the starter's MongoDB 4.4 packages.
FROM python:3.8-bullseye

RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# Bullseye packages have moved off the regular mirrors to Debian's archive.
RUN sed -i 's|http://deb.debian.org|https://archive.debian.org|g' /etc/apt/sources.list
RUN apt-get -y update && apt-get install -y curl nano wget nginx git

RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list


# Mongo
RUN ln -s /bin/echo /bin/systemctl
RUN wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | apt-key add -
RUN echo "deb http://repo.mongodb.org/apt/debian buster/mongodb-org/4.4 main" | tee /etc/apt/sources.list.d/mongodb-org-4.4.list
RUN apt-get -y update
RUN apt-get install -y mongodb-org

# Install Yarn
RUN apt-get install -y yarn

# The Python image already includes pip; easy_install is no longer available.


ENV ENV_TYPE staging
ENV MONGO_HOST mongo
ENV MONGO_PORT 27017
##########

ENV PYTHONPATH=$PYTHONPATH:/src/

# copy the dependencies file to the working directory
COPY src/requirements.txt .

# install dependencies
RUN pip install -r requirements.txt
