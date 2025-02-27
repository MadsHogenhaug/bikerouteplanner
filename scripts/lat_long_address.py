# importing geopy library and Nominatim class
from geopy.geocoders import Nominatim

# calling the Nominatim tool and create Nominatim class
loc = Nominatim(user_agent="Geopy Library")
# taking user input for the location

yes_address = True

location = input("Enter the location: ")
getLoc = loc.geocode(location)

# printing address
print(getLoc.address)

# printing latitude and longitude
print("Longitude = ", getLoc.longitude)
print("Latitude = ", getLoc.latitude)
print(f'{getLoc.longitude}, {getLoc.latitude}')

