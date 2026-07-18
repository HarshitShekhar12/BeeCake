const { createApp, ref, computed, onMounted } = Vue;

createApp({
    setup() {
        const menuItems = ref([]);
        const dietaryText = ref("100% Purely Veg");
        const showPaymentModal = ref(false); // Controlled visibility flag for custom secure modal popup

        const extraAddons = ref([
            { id: 101, name: "Plain Candle", price: 20 },
            { id: 102, name: "Number Candle", price: 40 },
            { id: 103, name: "Golden Number Candle", price: 60 },
            { id: 104, name: "Anniversary Tag", price: 50 },
            { id: 105, name: "Birthday Tag", price: 50 },
            { id: 106, name: "Custom Name Tag", price: 80 },
            { id: 107, name: "Premium Gift Packing", price: 120 }
        ]);

        const isCartOpen = ref(false);
        const isCheckingOut = ref(false);
        const cart = ref([]);
        const whatsappDescription = ref("");

        const customCake = ref({
            flavor: null,
            weight: 1.0,
            addons: [],
            message: ""
        });

        const checkoutDetails = ref({
            name: "",
            phone: "",
            address: "",
            payMethod: "UPI", // Restricted exclusively to UPI Transfer
            upiId: "vishakha.choudhary07@okicici"
        });

        // Reads data directly from your local menu-data.js database file object
        const loadDatabase = () => {
            const data = window.bakeryDatabase;
            if (data && data.menu_items) {
                menuItems.value = data.menu_items.map(item => ({
                    id: item.id,
                    name: `${item.name} (${item.purely_veg ? 'Pure Veg 🌱' : ''})`,
                    price: item.price_per_pound,
                    desc: item.description,
                    image: item.image // Seamlessly tracks item local image filenames
                }));
                
                if (data.bakery_meta && data.bakery_meta.dietary_standard) {
                    dietaryText.value = data.bakery_meta.dietary_standard;
                }
                
                if (menuItems.value.length > 0) {
                    customCake.value.flavor = menuItems.value[0];
                }
            }
        };

        const calculatedCustomPrice = computed(() => {
            if (!customCake.value.flavor) return 0;
            let basePrice = customCake.value.flavor.price * customCake.value.weight;
            
            customCake.value.addons.forEach(addon => {
                if (addon === 'Choco Chips') basePrice += 50;
                if (addon === 'Honey Drizzle') basePrice += 30;
                if (addon === 'Fresh Fruits') basePrice += 100;
            });
            
            return Math.round(basePrice);
        });

        const cartCount = computed(() => cart.value.reduce((total, item) => total + item.quantity, 0));
        const cartTotal = computed(() => cart.value.reduce((total, item) => total + item.totalPrice, 0));

        const addToCart = (item) => {
            const existingIndex = cart.value.findIndex(c => c.id === item.id && !c.isCustom);
            if (existingIndex > -1) {
                cart.value[existingIndex].quantity += 1;
                cart.value[existingIndex].totalPrice = cart.value[existingIndex].quantity * item.price;
            } else {
                cart.value.push({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: 1,
                    totalPrice: item.price,
                    isCustom: false
                });
            }
            isCartOpen.value = true;
        };

        const addExtraToCart = (extra) => {
            const existingIndex = cart.value.findIndex(c => c.id === extra.id);
            if (existingIndex > -1) {
                cart.value[existingIndex].quantity += 1;
                cart.value[existingIndex].totalPrice = cart.value[existingIndex].quantity * extra.price;
            } else {
                cart.value.push({
                    id: extra.id,
                    name: extra.name,
                    price: extra.price,
                    quantity: 1,
                    totalPrice: extra.price,
                    isCustom: false
                });
            }
        };

        const addCustomCakeToCart = () => {
            if (!customCake.value.flavor) return;
            const calculatedPrice = calculatedCustomPrice.value;
            const cakeName = `Custom ${customCake.value.flavor.name}`;
            
            cart.value.push({
                id: Date.now(),
                name: cakeName,
                price: calculatedPrice,
                quantity: 1,
                totalPrice: calculatedPrice,
                isCustom: true,
                weight: customCake.value.weight,
                message: customCake.value.message,
                addons: [...customCake.value.addons]
            });

            customCake.value.weight = 1.0;
            customCake.value.addons = [];
            customCake.value.message = "";
            isCartOpen.value = true;
        };

        const openPaymentModal = () => {
            if (!checkoutDetails.value.name.trim() || !checkoutDetails.value.phone.trim() || !checkoutDetails.value.address.trim()) {
                alert("Please fill out all delivery details fields completely before proceeding to payment!");
                return;
            }
            showPaymentModal.value = true;
        };

        const confirmPaidOrder = () => {
            let orderSummary = `✨ *NEW ORDER RECEIVED - BEE CAKE* ✨\n\n`;
            orderSummary += `👤 *Customer Name:* ${checkoutDetails.value.name}\n`;
            orderSummary += `📞 *Mobile Number:* ${checkoutDetails.value.phone}\n`;
            orderSummary += `📍 *Delivery Address:* ${checkoutDetails.value.address}\n`;
            orderSummary += `💳 *Payment Type:* UPI Secure Transfer Verified\n\n`;
            orderSummary += `🎂 *Order Basket Details:* \n`;

            cart.value.forEach(item => {
                orderSummary += `• ${item.name} (x${item.quantity}) - ₹${item.totalPrice}\n`;
                if (item.isCustom) {
                    orderSummary += `  └ Size: ${item.weight}lb | Note: "${item.message || 'None'}"\n`;
                }
            });

            orderSummary += `\n💰 *Total Amount Paid: ₹${cartTotal.value}*\n\n`;
            orderSummary += `📌 *Note:* Please send the screenshot of your payment inside this chat window to verify your transaction!`;

            const targetPhone = "7752891455";
            window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(orderSummary)}`, '_blank');

            // Reset UI states completely upon dispatch operation loop execution
            cart.value = [];
            showPaymentModal.value = false;
            isCheckingOut.value = false;
            isCartOpen.value = false;
        };

        const sendWhatsAppRequest = () => {
            if (!whatsappDescription.value.trim()) {
                alert("Please type out a description of your custom cake before sending.");
                return;
            }
            const targetPhone = "7752891455";
            const greetingText = `Hello Vishakha! I would like to place a custom cake order request at Bee Cake.\n\n*Description Details*:\n${whatsappDescription.value}`;
            window.open(`https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(greetingText)}`, '_blank');
        };

        const removeFromCart = (index) => {
            cart.value.splice(index, 1);
            if (cart.value.length === 0) {
                isCheckingOut.value = false;
            }
        };

        onMounted(() => {
            loadDatabase();
            if (window.lucide) {
                window.lucide.createIcons();
            }
        });

        return {
            menuItems,
            dietaryText,
            extraAddons,
            isCartOpen,
            isCheckingOut,
            cart,
            customCake,
            checkoutDetails,
            whatsappDescription,
            calculatedCustomPrice,
            cartCount,
            cartTotal,
            showPaymentModal,
            addToCart,
            addExtraToCart,
            addCustomCakeToCart,
            openPaymentModal,
            confirmPaidOrder,
            sendWhatsAppRequest,
            removeFromCart
        };
    }
}).mount('#app');